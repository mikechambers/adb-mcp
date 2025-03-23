import socketio
import time
import threading
import json
from queue import Queue
import logger

# Global configuration variables
proxy_url = None
proxy_timeout = None
application = None

def send_message_blocking(command, timeout=None):
    """
    Blocking function that connects to a Socket.IO server, sends a message,
    waits for a response, then disconnects.
    
    Args:
        command: The command to send
        timeout (int): Maximum time to wait for response in seconds
        
    Returns:
        dict: The response received from the server, or None if no response
    """
    # Use global variables
    global application, proxy_url, proxy_timeout
    
    # Check if configuration is set
    if not application or not proxy_url or not proxy_timeout:
        logger.log("Socket client not configured. Call configure() first.")
        return None
    
    # Use provided timeout or default
    wait_timeout = timeout if timeout is not None else proxy_timeout
    
    # Create a standard (non-async) SocketIO client with WebSocket transport only
    sio = socketio.Client(logger=False)
    
    # Use a queue to get the response from the event handler
    response_queue = Queue()
    
    @sio.event
    def connect():
        logger.log(f"Connected to server with session ID: {sio.sid}")
        
        # Send the command
        logger.log(f"Sending message to {application}: {command}")
        sio.emit('command_packet', {
            'type': "command",
            'application': application,
            'command': command
        })
    
    @sio.event
    def packet_response(data):
        logger.log(f"Received response: {data}")
        response_queue.put(data)
        # Disconnect after receiving the response
        sio.disconnect()
    
    @sio.event
    def disconnect():
        logger.log("Disconnected from server")
        # If we disconnect without response, put None in the queue
        if response_queue.empty():
            response_queue.put(None)
    
    @sio.event
    def connect_error(error):
        logger.log(f"Connection error: {error}")
        response_queue.put(None)
    
    # Connect in a separate thread to avoid blocking the main thread during connection
    def connect_and_wait():
        try:
            sio.connect(proxy_url, transports=['websocket'])
            # Keep the client running until disconnect is called
            sio.wait()
        except Exception as e:
            logger.log(f"Error: {e}")
            if response_queue.empty():
                response_queue.put(None)
            if sio.connected:
                sio.disconnect()
    
    # Start the client in a separate thread
    client_thread = threading.Thread(target=connect_and_wait)
    client_thread.daemon = True
    client_thread.start()
    
    try:
        # Wait for a response or timeout
        logger.log("waiting for response...")
        response = response_queue.get(timeout=wait_timeout)
        if response:
            logger.log("response received...")
            try:
                logger.log(json.dumps(response))
            except:
                logger.log(f"Response (not JSON-serializable): {response}")
        return response
    except Exception as e:
        logger.log(f"Error waiting for response: {e}")
        if sio.connected:
            sio.disconnect()
        return None
    finally:
        # Make sure client is disconnected
        if sio.connected:
            sio.disconnect()
        # Wait for the thread to finish (should be quick after disconnect)
        client_thread.join(timeout=1)

def configure(app=None, url=None, timeout=None, log_file_path=None):
    
    global application, proxy_url, proxy_timeout
    
    if log_file_path:
        logger.configure(log_file_path=log_file_path)
    
    if app:
        application = app
    if url:
        proxy_url = url
    if timeout:
        proxy_timeout = timeout
    
    logger.log(f"Socket client configured: app={application}, url={proxy_url}, timeout={proxy_timeout}")