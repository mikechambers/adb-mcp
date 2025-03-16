const express = require('express')
const app = express()
app.use(express.json());
const port = 3030

app.get('/retrieve/', (req, res) => {

    let packet = {
        status:"SUCCESS",
        commands : []
    }

    let out = JSON.stringify(packet)

    res.setHeader('Content-Type', 'application/json');
    res.send(out)
  })

app.post('/', function(request, response){
    console.log(request.body);
    
    let out = {status:"SUCCESS"}
    
    // your JSON
     response.send(JSON.stringify(out));    // echo the result back
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
