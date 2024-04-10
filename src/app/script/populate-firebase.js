const admin = require('firebase-admin');
const serviceAccount = require('../script/serviceAccountKey.json');
const fs = require('fs');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const questions = JSON.parse(fs.readFileSync('questions.json', 'utf8'));

async function populateDatabase() {
  const promises = questions.map(question => {
    const fullQuestion = {
      ...question,
      createdAt: admin.firestore.Timestamp.fromDate(new Date()),
      approved: false,
      submittedBy: 'system',
    };

    return db.collection('questions').add(fullQuestion);
  });

  await Promise.all(promises);
  console.log('Todas las preguntas han sido añadidas a la base de datos.');
}

populateDatabase().catch(console.error);
