const express = require('express');
const app = express();
app.use(express.json());
const port = 3030;

const PHOTOSHOP = "photoshop";
const ILLUSTRATOR = "illustrator";

let commands = {
  [PHOTOSHOP]: [],
  [ILLUSTRATOR]: []
};



app.get('/commands/get/:application', (req, res) => {
  // Access the variable via req.params
  const application = req.params.application;

  let packet = null

  if (!isSupportedApplication(application)) {
    packet = {
      status: "FAIL",
      message: `Unknown command application: ${application}`
    };
  } else {

    packet = {
      status: "SUCCESS",
      application:application,
      commands:commands[application].slice()
    }

    commands[application].length = 0
  }

  res.json(packet);
});

// POST endpoint to add a new command
app.post('/commands/add/', (req, res) => {

  console.log("/commands/add/")

  const command = req.body;
  const application = command.application;

  console.log(command)

  // Default to SUCCESS
  let out = { status: "SUCCESS" };

  // Check if application is recognized
  if (!isSupportedApplication(application)) {
    out = {
      status: "FAIL",
      message: `Unknown command application: ${application}`
    };
  } else {
    // If recognized, push the entire command object into the array
    commands[application].push(command);
  }

  console.log(out)
  // Return the status
  res.json(out);
});

const isSupportedApplication = (application) => {
  return application === PHOTOSHOP || application === ILLUSTRATOR;
};

// Start the server
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
