import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getCountFromServer } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyBtLTZInxyKjbQCoSvqKOGDdOjhrOFfgaM",
    authDomain: "tgf-meditation.firebaseapp.com",
    projectId: "tgf-meditation",
    storageBucket: "tgf-meditation.firebasestorage.app",
    messagingSenderId: "795468174785",
    appId: "1:795468174785:web:3df58c8aa84827e5d58b40"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testCount() {
    try {
        console.log('Fetching user count...');
        const snapshot = await getCountFromServer(collection(db, 'users'));
        console.log('Total users:', snapshot.data().count);
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

testCount();
