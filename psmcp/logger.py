import os
import datetime

file_path = None


import sys
def log(message, filter_tag="LOGGER"):

    print(f"{filter_tag} : {message}", file=sys.stderr)

