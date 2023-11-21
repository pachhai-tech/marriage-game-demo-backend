const { onCall } = require('firebase-functions/v2/https')
const { logger } = require('firebase-functions')
const { FieldValue } = require('@google-cloud/firestore')
const admin = require('firebase-admin')

module.exports = onCall(
  {
    enforceAppCheck: true
  },
  async (request) => {
    try {
      logger.log('data:', request.data)

      const { authToken, gameSettings } = request.data
      const decodedToken = await admin.auth().verifyIdToken(authToken)
      if (!decodedToken) {
        console.error('User is not authenticated')
        throw new Error('User is not authenticated')
      }

      const uid = decodedToken.uid
      const db = admin.firestore()

      // Create a new document
      let gameRef = db.collection('marriageScoreTracker').doc()
      await gameRef.set({
        uid,
        settings: gameSettings,
        plays: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      const userRef = db.collection('users').doc(uid)
      await userRef.update({
        marriageScoreTracker: FieldValue.increment(1)
      })

      // Return the new game ID
      return {
        success: true,
        gameId: gameRef.id // This is the ID of the newly created document
      }
    } catch (error) {
      console.error('Error in createMarriageScoreTracker:', error)
      throw new Error('Error in createMarriageScoreTracker:', error.message)
    }
  }
)
