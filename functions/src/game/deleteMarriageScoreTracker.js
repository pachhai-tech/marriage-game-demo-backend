const { onCall } = require('firebase-functions/v2/https')
const { logger } = require('firebase-functions')
const admin = require('firebase-admin')

module.exports = onCall(
  {
    enforceAppCheck: true
  },
  async (request) => {
    try {
      logger.log('data:', request.data)

      const { authToken, docIds } = request.data

      const decodedToken = await admin.auth().verifyIdToken(authToken)
      if (!decodedToken) {
        console.error('User is not authenticated')
        throw new Error('User is not authenticated')
      }

      const uid = decodedToken.uid
      const db = admin.firestore()
      const batch = db.batch()

      // Check if docIds is an array and has elements
      if (!Array.isArray(docIds) || docIds.length === 0) {
        console.error('No document IDs provided for deletion')
        throw new Error('No document IDs provided for deletion')
      }

      let deletedGameIDs = []
      let gamesToRemove = 0

      // Check ownership of each VC before deletion
      for (const docId of docIds) {
        const gameRef = db.collection('marriageScoreTracker').doc(docId)
        const doc = await gameRef.get()

        if (!doc.exists) {
          console.error(`Document with ID ${docId} does not exist`)
          throw new Error(`Document with ID ${docId} does not exist`)
        }

        const gameData = doc.data()
        if (gameData.uid !== uid) {
          console.error(
            `Unauthorized deletion attempt for document ID ${docId}`
          )
          throw new Error(
            `Unauthorized deletion attempt for document ID ${docId}`
          )
        }

        gamesToRemove -= 1
        batch.delete(gameRef)
        deletedGameIDs.push(docId)
      }

      const userRef = db.collection('users').doc(uid)
      const userDoc = await userRef.get()
      if (userDoc.exists) {
        const userData = userDoc.data()
        let newMarriageScoreTracker =
          (userData.marriageScoreTracker || 0) + gamesToRemove

        // Ensure values do not go below zero
        newMarriageScoreTracker = Math.max(0, newMarriageScoreTracker)

        batch.update(userRef, {
          marriageScoreTracker: newMarriageScoreTracker
        })
      } else {
        console.error(`User document for UID ${uid} not found`)
        throw new Error(`User document for UID ${uid} not found`)
      }

      // Commit the batch
      await batch.commit()

      return {
        success: true,
        deletedGameIDs
      }
    } catch (error) {
      console.error('Error in deleteMarriageScoreTracker:', error)
      throw new Error('Error in deleteMarriageScoreTracker:', error.message)
    }
  }
)
