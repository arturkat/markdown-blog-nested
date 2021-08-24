if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}

// Libs
const path = require('path')
const mongoose = require('mongoose')
const express = require('express')
const app = express()
const methodOverride = require('method-override')

// Routes
const indexRouter = require('./routes/index')
const articleRouter = require('./routes/articles')

/* Connect to Mongo DB */
mongoose.connect(process.env.DATABASE_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true
})
const db = mongoose.connection
db.on('error', (error) => {
    console.error('DB connection error!')
    console.error(error)
})
db.once('open', () => console.log('Connected to Mongoose'))
// mongoose.connect('mongodb://localhost/markdown-blog', {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
//     useCreateIndex: true
// })

// Set up my view engine (convert my ejs to html)
app.set('view engine', 'ejs')

// Set the static path (in order to include bootstap css link)
app.use(express.static('public')) // app.use(express.static(path.join(__dirname, 'public')))
app.use(express.static('node_modules')) // app.use(express.static(path.join(__dirname, 'node_modules')))

// Get ability to pull the form's data via 'req.body' object
app.use(express.urlencoded({ extended: false }))

// Use lib to overrride http methods
app.use(methodOverride('_method')) // specify the parameter name for this library as '_method'


/* ROUTEs */
// Use my index router
app.use('/', indexRouter)
// Use my articles router after '/articles' url part
app.use('/articles', articleRouter)


// app.listen(5000)
app.listen(process.env.PORT || 5000)