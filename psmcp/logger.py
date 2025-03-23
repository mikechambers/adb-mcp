import os
import datetime

file_path = None

def configure(log_file_path: str):
    """Configure the logger with the file path to write logs to"""
    global file_path
    
    # Expand user directory if path contains ~
    expanded_path = os.path.expanduser(log_file_path)
    
    # Create the directory if it doesn't exist
    log_dir = os.path.dirname(expanded_path)
    if log_dir and not os.path.exists(log_dir):
        os.makedirs(log_dir)
    
    file_path = expanded_path
    
    # Test that we can write to the file
    try:
        with open(file_path, "a") as _:
            pass
        return True
    except Exception as e:
        print(f"Error configuring logger: {e}")
        return False

def log(message, include_timestamp=False):
    """Write a message to the log file"""
    if not file_path:
        print("Logger not configured. Call configure() first.")
        return False
    
    try:
        # Add timestamp if requested
        if include_timestamp:
            timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
            log_entry = f"[{timestamp}] {message}\n"
        else:
            log_entry = f"{message}\n"
        
        # Append to the log file
        with open(file_path, "a") as log_file:
            log_file.write(log_entry)
        return True
    except Exception as e:
        print(f"Error writing to log: {e}")
        return False