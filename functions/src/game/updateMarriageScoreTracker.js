const { onCall } = require('firebase-functions/v2/https')
const { logger } = require('firebase-functions')
const { FieldValue } = require('@google-cloud/firestore')
const admin = require('firebase-admin')

const calculateMarriageWinner = (plays, pointRate, currency) => {
  // Object to keep track of total points for each player
  const totalPoints = {}

  // Iterate through each play and accumulate points
  Object.values(plays).forEach((play) => {
    if (totalPoints[play.playerName]) {
      totalPoints[play.playerName] += play.points
    } else {
      totalPoints[play.playerName] = play.points
    }
  })

  // Find the player with the highest points
  let winnerName = ''
  let maxPoints = 0
  for (const [playerName, points] of Object.entries(totalPoints)) {
    if (points > maxPoints) {
      maxPoints = points
      winnerName = playerName
    }
  }

  const winner = {
    playerName: winnerName,
    points: maxPoints,
    value: maxPoints * pointRate,
    currency
  }

  return winner
}

module.exports = onCall(
  {
    enforceAppCheck: true
  },
  async (request) => {
    try {
      logger.log('data:', request.data)

      const { authToken, gameId, plays = {} } = request.data
      const decodedToken = await admin.auth().verifyIdToken(authToken)
      if (!decodedToken) {
        console.error('User is not authenticated')
        throw new Error('User is not authenticated')
      }

      if (!gameId) {
        console.error('Game ID is required')
        throw new Error('Game ID is required')
      }

      const uid = decodedToken.uid
      const db = admin.firestore()

      let gameRef = db.collection('marriageScoreTracker').doc(gameId)
      // Update data
      await gameRef.update({
        uid,
        plays,
        updatedAt: new Date().toISOString()
      })

      const gameDoc = await gameRef.get()

      // Calculate the winner
      let winner = {}
      if (Object.keys(plays).length === gameDoc.data().settings.numPlayers) {
        winner = calculateMarriageWinner(
          plays,
          gameDoc.data().settings.pointRate,
          gameDoc.data().settings.currency
        )
      }

      // Return the new game ID
      return {
        success: true,
        winner
      }
    } catch (error) {
      console.error('Error in updateMarriageScoreTracker:', error)
      throw new Error('Error in updateMarriageScoreTracker:', error.message)
    }
  }
)
