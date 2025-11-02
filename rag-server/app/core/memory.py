"""Chat message history management with DynamoDB."""

import os
import boto3
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_community.chat_message_histories import DynamoDBChatMessageHistory
from dotenv import load_dotenv

load_dotenv()

# DynamoDB 클라이언트 초기화
_dynamodb_client = None


def _get_dynamodb_client():
    """Get or create DynamoDB client"""
    global _dynamodb_client
    if _dynamodb_client is None:
        _dynamodb_client = boto3.resource(
            'dynamodb',
            aws_access_key_id=os.getenv('DDB_AWS_ACCESS_KEY'),
            aws_secret_access_key=os.getenv('DDB_AWS_SECRET_ACCESS_KEY'),
            region_name=os.getenv('DDB_AWS_REGION', 'ap-northeast-2')
        )
    return _dynamodb_client


def get_session_history(session_id: str) -> BaseChatMessageHistory:
    """
    세션 ID별로 채팅 기록을 관리 (DynamoDB 기반)
    
    Args:
        session_id: 세션 식별자
        
    Returns:
        BaseChatMessageHistory: 해당 세션의 채팅 기록
    """
    table_name = os.getenv('DDB_TABLE_FOR_RAG', 'teacher-bo-rag')
    
    return DynamoDBChatMessageHistory(
        table_name=table_name,
        session_id=session_id,
        boto3_session=boto3.Session(
            aws_access_key_id=os.getenv('DDB_AWS_ACCESS_KEY'),
            aws_secret_access_key=os.getenv('DDB_AWS_SECRET_ACCESS_KEY'),
            region_name=os.getenv('DDB_AWS_REGION', 'ap-northeast-2')
        )
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
        table_name = os.getenv('DDB_TABLE_FOR_RAG', 'teacher-bo-rag')
        dynamodb = _get_dynamodb_client()
        table = dynamodb.Table(table_name)
        
        # Query all items for this session_id
        response = table.query(
            KeyConditionExpression='SessionId = :sid',
            ExpressionAttributeValues={':sid': session_id}
        )
        
        # Delete all items
        with table.batch_writer() as batch:
            for item in response.get('Items', []):
                batch.delete_item(Key={'SessionId': session_id})
        
        return True
    except Exception as e:
        print(f"Error deleting session {session_id}: {e}")
        return False
