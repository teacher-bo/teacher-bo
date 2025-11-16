"""Chat message history management with DynamoDB.

Refactors to:
- Centralize configuration and avoid leaking table name defaults.
- Reuse a single boto3 Session/Resource.
- Improve delete logic using the table key schema and pagination.
- Support optional local DynamoDB endpoint for development (DDB_ENDPOINT_URL).

Notes:
- Environment variables only read by name; no defaults for sensitive settings like table name.
- Comments are written in English per repository guidelines.
"""

import os
import boto3
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_community.chat_message_histories import DynamoDBChatMessageHistory
from dotenv import load_dotenv
from boto3.dynamodb.conditions import Key
from typing import Optional, Dict, Any, List

load_dotenv()

# Global cached session/resource
_boto3_session: Optional[boto3.session.Session] = None
_dynamodb_resource = None

MAX_HISTORY = 1 * 2 # 총 1개의 질문,답변을 저장 (질문/답변 각각 갯수로 쳐서 2 곱해야함)

def _get_boto3_session() -> boto3.session.Session:
    """Create or return a cached boto3 Session.

    Prefer the default AWS credential/provider chain. Only pass explicit
    credentials when they are set via env vars to avoid accidental empty values.
    """
    global _boto3_session
    if _boto3_session is None:
        aws_access_key = os.getenv('DDB_AWS_ACCESS_KEY')
        aws_secret_key = os.getenv('DDB_AWS_SECRET_ACCESS_KEY')
        region = os.getenv('DDB_AWS_REGION')

        if aws_access_key and aws_secret_key:
            # Explicit credentials path
            _boto3_session = boto3.Session(
                aws_access_key_id=aws_access_key,
                aws_secret_access_key=aws_secret_key,
                region_name=region or 'ap-northeast-2',
            )
        else:
            # Use default credential chain (env, config, EC2/ECS role, SSO, etc.)
            _boto3_session = boto3.Session(region_name=region or 'ap-northeast-2')
    return _boto3_session


def _get_dynamodb_resource() -> Any:
    """Create or return a cached DynamoDB resource from the session.

    Supports optional local endpoint via DDB_ENDPOINT_URL.
    """
    global _dynamodb_resource
    if _dynamodb_resource is None:
        session = _get_boto3_session()
        endpoint_url = os.getenv('DDB_ENDPOINT_URL')  # Optional (e.g., DynamoDB Local)
        _dynamodb_resource = session.resource('dynamodb', endpoint_url=endpoint_url)
    return _dynamodb_resource


def _require_table_name() -> str:
    """Return the DynamoDB table name from env, or raise if missing.

    Avoid setting a hard-coded default to prevent accidental leakage of
    environment-specific resource names.
    """
    table_name = os.getenv('DDB_TABLE_FOR_RAG')
    if not table_name:
        raise ValueError(
            "DDB_TABLE_FOR_RAG is required but not set. Configure it in environment variables."
        )
    return table_name


def get_session_history(session_id: str) -> BaseChatMessageHistory:
    """
    세션 ID별로 채팅 기록을 관리 (DynamoDB 기반)
    
    Args:
        session_id: 세션 식별자
        
    Returns:
        BaseChatMessageHistory: 해당 세션의 채팅 기록
    """
    table_name = _require_table_name()
    session = _get_boto3_session()

    return DynamoDBChatMessageHistory(
        table_name=table_name,
        session_id=session_id,
        boto3_session=session,
        history_size=MAX_HISTORY,
    )


def delete_session_history(session_id: str) -> bool:
    """
    특정 세션의 대화 기록을 DynamoDB에서 삭제
    
    Args:
        session_id: 세션 식별자
        
    Returns:
        bool: 삭제 성공 여부
    """
    try:
        table_name = _require_table_name()
        table = _get_dynamodb_resource().Table(table_name)

        # Query all items for this session_id with pagination
        last_evaluated_key: Optional[Dict[str, Any]] = None
        items: List[Dict[str, Any]] = []
        while True:
            kwargs: Dict[str, Any] = {
                'KeyConditionExpression': Key('SessionId').eq(session_id)
            }
            if last_evaluated_key:
                kwargs['ExclusiveStartKey'] = last_evaluated_key

            response = table.query(**kwargs)
            items.extend(response.get('Items', []))
            last_evaluated_key = response.get('LastEvaluatedKey')
            if not last_evaluated_key:
                break

        if not items:
            return True

        # Build delete keys using the table's key schema
        key_schema = table.key_schema  # e.g., [{'AttributeName': 'SessionId', 'KeyType': 'HASH'}, ...]

        def build_key(it: Dict[str, Any]) -> Dict[str, Any]:
            key: Dict[str, Any] = {}
            for ks in key_schema:
                attr = ks['AttributeName']
                if attr in it:
                    key[attr] = it[attr]
            # Fallback: at least provide partition key when schema unavailable
            if not key and 'SessionId' in it:
                key['SessionId'] = it['SessionId']
            return key

        with table.batch_writer() as batch:
            for item in items:
                key = build_key(item)
                if key:
                    batch.delete_item(Key=key)

        return True
    except Exception as e:
        print(f"Error deleting session {session_id}: {e}")
        return False
