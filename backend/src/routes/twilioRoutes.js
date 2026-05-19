const express = require('express');
const { router: twilioRouter } = require('../voice/twilioHandler');
const { validateTwilioSignature } = require('../middleware/twilioValidation');

const router = express.Router();

router.use(validateTwilioSignature);
router.use('/', twilioRouter);

module.exports = router;
