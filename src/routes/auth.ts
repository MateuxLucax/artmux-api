import express from 'express'

const router = express.Router()

router.get('/signup', (req, res) => {
  res.json({
    name: 'signup',
  })
})

router.get('/signin', (req, res) => {
  res.json({
    name: 'signin',
  })
})

export default router