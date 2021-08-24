const express = require('express')
const router = express.Router()

// Get mongoose model for Article collection
const Article = require('../models/article')

router.get('/', async (req, res) => {
    let articles = null
    try {
        articles = await Article.find().sort({
            createdAt: 'desc'
        })
    } catch (error) {
        console.log(error)
    }
    res.render('articles/index', {
        articles: articles
    })
    // res.send('Hello!')
})

module.exports = router