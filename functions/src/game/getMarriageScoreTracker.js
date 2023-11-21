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

      const { authToken, query, itemsPerPage, startAfterDoc } = request.data

      const decodedToken = await admin.auth().verifyIdToken(authToken)
      if (!decodedToken) {
        console.error('User is not authenticated')
        throw new Error('User is not authenticated')
      }

      const db = admin.firestore()

      // Check if query contains a specific document ID
      if (query && query.docId) {
        const doc = await db
          .collection('marriageScoreTracker')
          .doc(query.docId)
          .get()
        if (!doc.exists) {
          throw new Error(`Document not found with the ID ${query.docId}`)
        }
        return { success: true, games: [doc.data()] }
      }

      let mstCollection = db
        .collection('marriageScoreTracker')
        .orderBy('createdAt', 'desc')

      // Filtering based on provided query parameters.
      const filterableFields = [
        'uid',
        'createdAt',
        'updatedAt',
        'settings.numPlayers',
        'settings.pointRate',
        'settings.currency'
      ]

      // Only filter if a query object is provided.
      if (query) {
        for (const field of filterableFields) {
          if (query[field]) {
            mstCollection = mstCollection.where(field, '==', query[field])
          }
        }
      }

      // Apply the limit for pagination.
      mstCollection = mstCollection.limit(itemsPerPage)

      // If a startAfterDoc is provided, fetch documents after it.
      if (startAfterDoc) {
        const docSnapshot = await db
          .collection('marriageScoreTracker')
          .doc(startAfterDoc)
          .get()
        if (docSnapshot.exists) {
          mstCollection = mstCollection.startAfter(docSnapshot)
        }
      }

      const snapshot = await mstCollection.get()

      const games = []
      snapshot.forEach((doc) => {
        let docData = doc.data()
        docData.docId = doc.id // Adding the document's ID so we can use it for pagination in the frontend.
        games.push(docData)
      })

      return { success: true, games }
    } catch (error) {
      logger.error('Error in getMarriageScoreTracker:', error)
      throw new Error('Error in getMarriageScoreTracker:', error)
    }
  }
)
