import logger

application = None


def createCommand(action:str, options:dict) -> str:
    command = {
        "application":application,
        "action":action,
        "options":options
    }

    return command

def sendCommand(command:dict):

    response = socket_client.send_message_blocking(command)
    
    logger.log(f"Final response: {response['status']}")
    return response