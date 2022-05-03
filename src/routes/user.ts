import express from 'express'
import knex from '../database'

const router = express.Router()

router.get('/all', async (req, res) => {
  const users = await knex('users').select('*')
  res.json(users)
})

export default router