'use strict';
//  firebase deploy --only functions
const functions = require('firebase-functions');
const {WebhookClient} = require('dialogflow-fulfillment');
const {Card, Suggestion} = require('dialogflow-fulfillment');
const admin = require('firebase-admin');
 
process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements
admin.initializeApp(functions.config().firebase);
const db = admin.firestore();

exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response });
  console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
  console.log('Dialogflow Request body: ' + JSON.stringify(request.body));
 
  
  function operatingHoursHelper(day) {
    const operatingHours = {
      "Monday" : {"Open": "8am", "Close": "12pm"},
      "Tuesday" : {"Open": "9am", "Close": "6pm"},
      "Wednesday" : {"Open": "9am", "Close": "6pm"},
      "Thursday" : {"Open": "9am", "Close": "6pm"},
      "Friday" : {"Open": "9am", "Close": "6pm"},
      "Saturday" : {"Open": "9am", "Close": "6pm"},
      "Sunday" : {"Open": "9am", "Close": "6pm"}
    };
    // what am i going to do for sunday if the store is closed then
    return operatingHours[day];
  }

  function getDayName(day) {
    const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    //First of month
    return dayNames[day];
  }
  
  function welcome(agent) {
    agent.add(`Welcome to my agent!`);
  }
 
  function fallback(agent) {
    agent.add(`I didn't understand`);
    agent.add(`I'm sorry, can you try again?`);
  }

  function firebaseTest(agent) {
    const dialogflowAgentRef = db.collection('users').doc();
    return db.runTransaction(t => {
        t.set(dialogflowAgentRef, {entry: "test2"});
        return Promise.resolve('Write complete');
      }).then(doc => {
        agent.add(`Wrote to the Firestore database.`);
      }).catch(err => {
        console.log(`Error writing to Firestore: ${err}`);
        agent.add(`Failed to write to the Firestore database.`);
      });
  }

//   create a document by day.
// check for the time of the appointment, if the store is open then.
  function appointment(agent) {
    const appointmentTime = new Date(agent.parameters['date-time']['date_time']);
    const monthNDay = (appointmentTime.getMonth() + 1) + '/' + appointmentTime.getDate().toString();
    const hour = appointmentTime.getHours();
    const minute = appointmentTime.getMinutes();
    const time = hour + ':' + minute;
    // const appointmentDoc = db.collection('appointments').doc(monthNDay);
    const appointmentDoc = db.collection('appointments').doc();

    return db.runTransaction(t => {
        t.set(appointmentDoc, {day: monthNDay, appointmentTime: time});
        return Promise.resolve('Write complete');
      }).then(doc => {
        agent.add(`Added appointment for ${monthNDay} at ${time}`);
      }).catch(err => {
        console.log(`Error writing to Firestore: ${err}`);
        agent.add(`Failed to write to the Firestore database.`);
      });

//     // agent.add(`Wrote to the Firestore database.`);
//    let getDoc = appointmentDoc.get()
//         .then(doc => {
//             if (!doc.exists) {
//                 console.log('No such document!');
//                 agent.add(`Wrote to the Firestore database.`);
//                 // appointmentDoc.set({[appointmentTime]: true});
//                 appointmentDoc.set({time: true});

//             } else {
//                 agent.add(`Appointment is not available`);
//                 console.log('Document data:', doc.data());
//             }
//         })
//         .catch(err => {
//             console.log('Error getting document', err);
//         });
  }

//   function appointmentRedux() {
//     agent.add(`Wrote to the Firestore database.`);
//   }
  
  function operatingHours(agent) {
    const operatingHours = agent.parameters['operating-hours'];
    const day = new Date(agent.parameters['date-time']);
    const dayName = getDayName(day.getDay());
    const storeHours = operatingHoursHelper(dayName);
    
    if(operatingHours.includes("open")){
      agent.add(`We open at ${storeHours.Open} on ${dayName}`);
    }
    else if(operatingHours.includes("close")) {
        agent.add(`We close at ${storeHours.Close} on ${dayName}`);
    }
    else if(operatingHours.includes("store hours")) {
        // look up the day an get the range
        agent.add(`Our operating hours on ${dayName} are from ${storeHours.Open} to ${storeHours.Close}`);
    }
  }

  // // Uncomment and edit to make your own intent handler
  // // uncomment `intentMap.set('your intent name here', yourFunctionHandler);`
  // // below to get this function to be run when a Dialogflow intent is matched
  // function yourFunctionHandler(agent) {
  //   agent.add(`This message is from Dialogflow's Cloud Functions for Firebase editor!`);
  //   agent.add(new Card({
  //       title: `Title: this is a card title`,
  //       imageUrl: 'https://developers.google.com/actions/images/badges/XPM_BADGING_GoogleAssistant_VER.png',
  //       text: `This is the body text of a card.  You can even use line\n  breaks and emoji! 💁`,
  //       buttonText: 'This is a button',
  //       buttonUrl: 'https://assistant.google.com/'
  //     })
  //   );
  //   agent.add(new Suggestion(`Quick Reply`));
  //   agent.add(new Suggestion(`Suggestion`));
  //   agent.setContext({ name: 'weather', lifespan: 2, parameters: { city: 'Rome' }});
  // }

  // // Uncomment and edit to make your own Google Assistant intent handler
  // // uncomment `intentMap.set('your intent name here', googleAssistantHandler);`
  // // below to get this function to be run when a Dialogflow intent is matched
  // function googleAssistantHandler(agent) {
  //   let conv = agent.conv(); // Get Actions on Google library conv instance
  //   conv.ask('Hello from the Actions on Google client library!') // Use Actions on Google library
  //   agent.add(conv); // Add Actions on Google library responses to your agent's response
  // }
  // // See https://github.com/dialogflow/fulfillment-actions-library-nodejs
  // // for a complete Dialogflow fulfillment library Actions on Google client library v2 integration sample

  // Run the proper function handler based on the matched Dialogflow intent name
  let intentMap = new Map();
  intentMap.set('Default Welcome Intent', welcome);
  intentMap.set('Default Fallback Intent', fallback);
  intentMap.set('store-time-info', operatingHours);
  intentMap.set('firebase-test', firebaseTest);
  intentMap.set('appointment - custom', appointment);
  // intentMap.set('your intent name here', yourFunctionHandler);
  // intentMap.set('your intent name here', googleAssistantHandler);
  agent.handleRequest(intentMap);
});
