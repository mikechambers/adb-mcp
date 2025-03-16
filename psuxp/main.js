const { entrypoints, UI } = require("uxp");

const app = require('photoshop').app;

let intervalId = null

let onInterval = async () => {
  console.log("tick", intervalId)
  let commands = await fetchCommands()

  console.log(commands)
}

let startInterval = () => {
  console.log("start interval")
  intervalId = setInterval(onInterval, 1000 * 2)

  //clearInterval
}

let stopInterval = () => {
  console.log("stop interval")
  clearInterval(intervalId)
  intervalId = null
}

let fetchCommands = async () => {
  try {

    let url = "http://127.0.0.1:3030/retrieve/"

    const fetchOptions = {
      method: "GET",
      headers: {
        "Accept": "application/json"
      },
    };
    
    // Make the fetch request
    const response = await fetch(url, fetchOptions);
    
    // Check if the request was successful
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error; // Re-throw to allow caller to handle the error
  }
}



entrypoints.setup({
  panels: {
    vanilla: {
      show(node ) {
      }
    }
  }
});

//Toggle button to make it start stop
document.getElementById("btnStart").addEventListener("click", () => {

  let b = document.getElementById("btnStart")

  if (intervalId) {
    stopInterval()
    b.textContent = "Start";
  } else {
    startInterval();
    b.textContent = "Stop";
  }

  /*
  try {
      await require('photoshop').core.executeAsModal(app.createDocument, {
        name: "Created by Plugin",
        width: 800,
        height: 600,
        resolution: 72,
        mode: "RGBColorMode"
    });

      
      // Display success message
      //UI.showSuccess("Document created successfully!");
  } catch (error) {
      // Handle errors
      console.error(error);
      //UI.showError("Failed to create document: " + error.message);
  }
      */
});