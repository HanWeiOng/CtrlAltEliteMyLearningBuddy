const express = require('express');
const router = express.Router();
const client = require('../databasepg');


router.get('/', async (req, res) => {
    try{
        const result = await client.query(`
            SELECT * FROM xyz
        `);
        console.log(result.rows)
        res.status(200).json(result.rows)
    }catch(error){
        console.error('Error retreiving all activitylog:', error);
        res.status(500).json({ message: 'Internal server error. ' + error.message });
    }
});

module.exports = router;