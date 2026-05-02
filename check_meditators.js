import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

async function findMeditators() {
    const targetDate = '2026-05-03';
    console.log(`Searching for people who meditated on ${targetDate}...`);
    
    try {
        const querySnapshot = await getDocs(collection(db, 'user_challenges'));
        const usersSnapshot = await getDocs(collection(db, 'users'));
        
        // Create a map of userId to Name
        const nameMap = {};
        usersSnapshot.forEach(doc => {
            nameMap[doc.id] = doc.data().name || 'Unknown';
        });

        const meditators = [];

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.completedDays && data.completedDays[targetDate] === true) {
                // Get name from nameMap using userId
                // Note: userId might be different format depending on registration version
                const name = nameMap[data.userId] || 'Unknown';
                meditators.push({ name, userId: data.userId });
            }
        });

        if (meditators.length > 0) {
            console.log(`\n✅ Found ${meditators.length} people:`);
            meditators.forEach((m, i) => {
                console.log(`${i + 1}. ${m.name} (ID: ${m.userId})`);
            });
        } else {
            console.log('\nNo one has meditated on May 3rd yet.');
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Failed to fetch data:', err);
        process.exit(1);
    }
}

findMeditators();
