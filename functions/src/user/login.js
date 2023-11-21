const { onCall } = require('firebase-functions/v2/https')
const { logger } = require('firebase-functions')
const admin = require('firebase-admin')
const { ethers } = require('ethers')
const { CHAIN_ID, convertChainIdFromHex } = require('../../shared/chainUtils')

module.exports = onCall(
  {
    enforceAppCheck: true // Reject requests with missing or invalid App Check tokens.
  },
  async (request) => {
    try {
      logger.log('data:', request.data)
      const { userInfo, magicIdToken } = request.data

      // Decode the magicIdToken from Base64
      const decodedToken = Buffer.from(magicIdToken, 'base64').toString('utf8')
      const [proof, claim] = JSON.parse(decodedToken)

      // Extract the 'iss' value (signer's address)
      const { iss } = JSON.parse(claim)
      const uid = iss.split(':')[2] // Extract address from "did:ethr:<address>"

      // Recover the signer's address using the signature and the message
      const recoveredAddress = ethers.verifyMessage(claim, proof)

      // Verify the token by comparing the addresses
      if (uid.toLowerCase() !== recoveredAddress.toLowerCase()) {
        throw new Error('Invalid Magic token')
      }

      // Generate a custom token for Firebase authentication using the 'iss' value
      const customToken = await admin.auth().createCustomToken(uid)
      logger.log('Generated customToken:', customToken)

      // Massage the userInfo if needed
      if (!userInfo.email) {
        delete userInfo.email
      } else {
        userInfo.emailVerified = true
      }
      if (!userInfo.phoneNumber) {
        delete userInfo.phoneNumber
      }

      // Check if the user already exists
      let user
      try {
        user = await admin.auth().getUser(uid)
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          // If user doesn't exist, create the user
          user = await admin.auth().createUser({
            uid,
            ...userInfo
          })
        } else {
          logger.error(
            'Error while trying to retrieve the user info from Firebase:',
            error
          )
          new Error(
            'Error while trying to retrieve the user info from Firebase:',
            error
          )
        }
      }

      if (user) {
        const userRef = admin.firestore().collection('users').doc(uid)
        const userDoc = await userRef.get()
        if (userDoc.exists) {
          await userRef.update({
            ...userInfo,
            did: `did:pkh:eip155:${convertChainIdFromHex(CHAIN_ID)}:${uid}`,
            loginCount: (userDoc.data().loginCount || 0) + 1,
            marriageScoreTracker: userDoc.data().marriageScoreTracker || 0
          })
        } else {
          await userRef.set({
            ...userInfo,
            did: `did:pkh:eip155:${convertChainIdFromHex(CHAIN_ID)}:${uid}`,
            loginCount: 1,
            marriageScoreTracker: 0
          })
        }
      }

      return { customToken }
    } catch (error) {
      logger.error('Error in login:', error)
      throw new Error('Error in login:', error)
    }
  }
)
