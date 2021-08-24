const mongoose = require('mongoose')
const marked = require('marked') // Converts markdown markup to html
const slugify = require('slugify') // Converts article's title to friendly url
const path = require('path')
const { v4: uuidv4 } = require('uuid') // uuidv4(); // ⇨ '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed'

const createDomPurify = require('dompurify') // sanitize the html from textarea
const { JSDOM } = require('jsdom') // module for 'dompurify'
const dompurify = createDomPurify(new JSDOM().window) // this allows as to create an html and purify it using JSDOM().window object

// Create base path for storing the cover images
const coverImageBasePath = 'uploads/articleCovers'

const articleSchema = new mongoose.Schema({
    uuid: {
        type: String,
        required: true,
        default: () => {
            return uuidv4()
        }
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    markdown: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
        // default: () => Date.now()
    },
    slug: {
        type: String,
        require: true,
        unique: true // force to have only unique values
    },
    sanitizedHtml: {
        type: String,
        required: true
    },
    folderName: {
        type: String,
        require: true,
        unique: true,
        trim: true,
        validate: {
            validator: (value) => {
                if (value === '') {
                    return false
                }
                return true
            },
            message: "{VALUE} is empty and not valid"
        }
    },
    coverImageName: {
        type: String,
        require: false
    },

    // an article can have multiple subArticles, so it should be in a array.
    subArticles: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SubArticle',
        required: false
    }],

    author: {
        type: mongoose.Schema.Types.ObjectId,
        required: false,
        ref: 'Author'
    },
    // coverImageDB: {
    //     type: Buffer,
    //     require: false
    // },
    // coverImageDBType: {
    //     type: String,
    //     require: false
    // },
})

// When we call the 'coverImagePath' it calls this get function
articleSchema.virtual('coverImagePath').get(function () {
    if (this.coverImageName != null) {
        return path.join('/', coverImageBasePath, this.folderName, this.coverImageName)
    }
})

// When we call the 'coverImageFolderPath' it calls this get function
articleSchema.virtual('coverImageFolderPath').get(function () {
    if (this.folderName != null) {
        return path.join('/', coverImageBasePath, this.folderName, '/')
    }
})

// The callback function runs every time whenever we save, update, create, delete ...
articleSchema.pre('validate', function (next) {
    // Create our slug from our title
    if (this.title) {
        this.slug = slugify(this.title, {
            lower: true,
            strict: true // get rid of any not allowed symbols for url
        })
    }

    // Convert our markdown to sanitized html
    if (this.markdown) {
        this.sanitizedHtml = dompurify.sanitize(marked(this.markdown))
    }

    next() // need to run it at the end
})

// When we call the 'coverImagePath' it calls this get function
// articleSchema.virtual('coverImageDBPath').get(function () {
//     if (this.coverImageDB != null && this.coverImageDBType != null) {
//         return `data:${this.coverImageDBType};charset=utf-8;base64,${this.coverImageDB.toString('base64')}`
//     }
// })

// When we call the 'folderName' it calls this get function
// articleSchema.virtual('folderName').get(function () {
//     return 'article-' + this.uuid
// })

module.exports = mongoose.model('Article', articleSchema)
module.exports.coverImageBasePath = coverImageBasePath
