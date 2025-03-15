const express = require('express');
const router = express.Router();
const client = require('../databasepg');


// sample function
async function calculateInOfficePercentage(teamId) {
    try {}
    catch (error) {
        console.error('errorMsg:', error);
        return {};
    }
}


router.get('/', async (req, res) => {
    try{
        const result = await client.query(`
            SELECT * FROM questions
            where topic_label = "Atomic and Mass Numbers: define proton (atomic) number and nucleon (mass) number"
        `);
        console.log(result.rows)
        res.status(200).json(result.rows)
    }catch(error){
        console.error('Error retreiving all activitylog:', error);
        res.status(500).json({ message: 'Internal server error. ' + error.message });
    }
});

module.exports = router;