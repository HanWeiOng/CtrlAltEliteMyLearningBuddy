const express = require('express');
const router = express.Router();
const client = require('../databasepg');


router.get('/', async (req, res) => {
    // retrieve all available question folders subsequently filter from FE
    try{
        const result = await client.query(`
            SELECT * FROM xyz
        `);
        console.log(result.rows)
        res.status(200).json(result.rows)
    }catch(error){
        console.error('Error retrieving all activitylog:', error);
        res.status(500).json({ message: 'Internal server error. ' + error.message });
    }
});

// router.get ACCEPT params (subject, banding, level)
// make request to DB, make SQL statement to retrieve relevant questions 


module.exports = router;
//test