const admin = require('firebase-admin')
const serviceAccount = require('./firebase-admin-sdk-pk.json')

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

const login = require('./src/user/login')
const getUserStats = require('./src/user/getUserStats')
const createMarriageScoreTracker = require('./src/game/createMarriageScoreTracker')
const getMarriageScoreTracker = require('./src/game/getMarriageScoreTracker')
const deleteMarriageScoreTracker = require('./src/game/deleteMarriageScoreTracker')
// ... Import other functions similarly ...

exports.login = login
exports.getUserStats = getUserStats
exports.createMarriageScoreTracker = createMarriageScoreTracker
exports.getMarriageScoreTracker = getMarriageScoreTracker
exports.deleteMarriageScoreTracker = deleteMarriageScoreTracker
// ... Export other functions similarly ...
