const { logger } = require('firebase-functions')
const { onCall } = require('firebase-functions/v2/https')
const admin = require('firebase-admin')

module.exports = onCall(
  {
    enforceAppCheck: true // Reject requests with missing or invalid App Check tokens.
  },
  async (request) => {
    try {
      logger.log('data:', request.data)

      const { authToken } = request.data

      const decodedToken = await admin.auth().verifyIdToken(authToken)
      if (!decodedToken) {
        console.error('User is not authenticated')
        throw new Error('User is not authenticated')
      }

      const userRef = admin.firestore().collection('users')
      const userSnapshot = await userRef.get()

      return {
        success: true,
        totalUsers: userSnapshot.size
      }
    } catch (error) {
      logger.error('Error in getUserStats:', error)
      throw new Error('Error in getUserStats:', error)
    }
  }
)
