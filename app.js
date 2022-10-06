"use strict";

const token = process.env.TOKEN

const request = require("request")
const express = require("express")
const body_parser = require("body-parser")
const axios = require("axios").default
const app = express().use(body_parser.json())
const {WebhookClient} = require('@google-cloud/dialogflow')
const dialogflow = require('@google-cloud/dialogflow')
const http = require('http')

const port = process.env.PORT || 1337;
const server = http.createServer(app);

const sessionClient = new dialogflow.SessionsClient({KeyFilename: 'wppbot-okgi-0dab2bd2409e.json'})

app.post('/webhookDialogFlow', function(request, response){
    const agent = new WebhookClient({request, response});
    let intentMap = new Map();
    intentMap.set('nomedaintencao', nomedaFuncao);
    agent.handleRequest(intentMap);
});

function nomedaFuncao(agent){

}

app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));

function isBlanck(str){
    return (!str || /^\s*$/.test(str));
}

async function detectIntent(
    projectId,
    sessionId,
    query,
    contexts,
    languageCode
){
    const sessionPath = sessionClient.projectAgentSessionPath(
        projectId,
        sessionId
    );

    //Texto da requisição
    const request = {
        session: sessionPath,
        queryInput: {
            text:{
                text: query,
                languageCode: languageCode,
            },
        },
    };

    if(contexts && contexts.length > 0){
        request.queryParams = {
            contexts: contexts,
        };
    }

    const responses = await sessionClient.detectIntent(request);
    return responses[0];

}

async function executeQueries(projectId, sessionId, queries, languageCode){
    let context;
    let intentResponse;

    for(const query of queries){
        try{
            console.log(`Pergunta: ${query}`);
            intentResponse = await detectIntent(
                projectId,
                sessionId,
                query,
                context,
                languageCode
            );
            
            if(isBlanck(intentResponse.queryResult.fulfillmentText)){
                console.log("Sem resposta definida no DialogFlow");
                return null;
            }
            else{
                console.log("Sem resposta definida no DialogFlow");
                return `${intentResponse.queryResult.fulfillmentText}`
            }
            
        } catch(error){
            console.log(error)
        }
    }
}


app.listen(process.env.PORT || 1337, () => console.log("webhook is listening"));
/*server.listen(port, function(){
    console.log("App running on *: " + port);
});*/

app.post("/webhook", async(req, res) =>{

    let h = req.body;

    if (req.body.object) {
        if (
          req.body.entry &&
          req.body.entry[0].changes &&
          req.body.entry[0].changes[0] &&
          req.body.entry[0].changes[0].value.messages &&
          req.body.entry[0].changes[0].value.messages[0]
        ) {
          let phone_number_id =
            req.body.entry[0].changes[0].value.metadata.phone_number_id;
          let from = req.body.entry[0].changes[0].value.messages[0].from; // extract the phone number from the webhook payload
          let msg_body = req.body.entry[0].changes[0].value.messages[0].text.body; // extract the message text from the webhook payload

          let textoResposta = await executeQueries(process.env.ACCOUNT_ID_DIALOG_FLOW, from, [msg_body], "pt-br");
          
          if(textoResposta !== null){

            axios({
                method: "POST", // Required, HTTP method, a string, e.g. POST, GET
                url:
                  "https://graph.facebook.com/v12.0/" +
                  phone_number_id +
                  "/messages?access_token=" +
                  token,
                data: {
                  messaging_product: "whatsapp",
                  to: from,
                  text: { body: textoResposta },//Manda a resposta
                },
                headers: { "Content-Type": "application/json" },
              });
          }
        }
        res.sendStatus(200);
      } else {
        // Return a '404 Not Found' if event is not from a WhatsApp API
        res.sendStatus(404);
      }
});

app.get("/webhook", (req, res) => {
    /**
     * UPDATE YOUR VERIFY TOKEN
     *This will be the Verify Token value when you set up webhook
    **/
    const verify_token = process.env.VERIFY_TOKEN;
  
    // Parse params from the webhook verification request
    let mode = req.query["hub.mode"];
    let token = req.query["hub.verify_token"];
    let challenge = req.query["hub.challenge"];
  
    // Check if a token and mode were sent
    if (mode && token) {
      // Check the mode and token sent are correct
      if (mode === "subscribe" && token === verify_token) {
        // Respond with 200 OK and challenge token from the request
        console.log("WEBHOOK_VERIFIED");
        res.status(200).send(challenge);
      } else {
        // Responds with '403 Forbidden' if verify tokens do not match
        res.sendStatus(403);
      }
    }
  });





