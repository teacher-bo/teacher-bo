"""
Main entry point for Silero VAD server
"""

import uvicorn
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app", host="0.0.0.0", port=1003, reload=True, log_level="info"
    )
