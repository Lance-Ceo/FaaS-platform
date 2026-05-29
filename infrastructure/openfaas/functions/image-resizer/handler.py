"""
Image Resizer - Sample Python 3 OpenFaaS Function
Endpoint: POST /function/image-resizer
Body: { "width": 800, "height": 600, "url": "https://..." }
"""
import json
import sys
from datetime import datetime


def handle(event, context):
    """Handle image resize request."""
    try:
        body = {}
        if event.body:
            body = json.loads(event.body) if isinstance(event.body, str) else event.body

        width = int(body.get('width', 800))
        height = int(body.get('height', 600))
        url = body.get('url', '')

        # Validate dimensions
        if width < 1 or width > 4096:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Width must be between 1 and 4096"})
            }
        if height < 1 or height > 4096:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Height must be between 1 and 4096"})
            }

        print(f"[image-resizer] Resizing to {width}x{height}", file=sys.stdout)

        return {
            "statusCode": 200,
            "body": json.dumps({
                "message": f"Image resized to {width}x{height}",
                "dimensions": {"width": width, "height": height},
                "source_url": url,
                "timestamp": datetime.utcnow().isoformat(),
                "runtime": "Python 3"
            })
        }

    except json.JSONDecodeError:
        return {
            "statusCode": 400,
            "body": json.dumps({"error": "Invalid JSON body"})
        }
    except Exception as e:
        print(f"[image-resizer] Error: {e}", file=sys.stderr)
        return {
            "statusCode": 500,
            "body": json.dumps({"error": "Internal function error"})
        }
