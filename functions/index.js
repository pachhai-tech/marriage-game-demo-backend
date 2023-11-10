const admin = require('firebase-admin')
const serviceAccount = require('./firebase-admin-sdk-pk.json')

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

const login = require('./src/user/login')
const getUserStats = require('./src/user/getUserStats')
// ... Import other functions similarly ...

exports.login = login
exports.getUserStats = getUserStats
// ... Export other functions similarly ...
