const mongoose = require('mongoose')
const path = require('path')
// const { v4: uuidv4 } = require('uuid') // uuidv4(); // ⇨ '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed'
const marked = require('marked') // Converts markdown markup to html

const createDomPurify = require('dompurify') // sanitize the html from textarea
const { JSDOM } = require('jsdom') // module for 'dompurify'
const dompurify = createDomPurify(new JSDOM().window) // this allows as to create an html and purify it using JSDOM().window object

// Create base path for storing the cover images
const coverImageBasePath = 'uploads/articleCovers'

// Get mongoose model for Article collection
const ArticleModel = require('./article')

const subArticleSchema = new mongoose.Schema({
    // uuid: {
    //     type: String,
    //     required: true,
    //     default: () => {
    //         return uuidv4()
    //     }
    // },
    createdAt: {
        type: Date,
        default: Date.now
        // default: () => Date.now()
    },
    markdown: {
        type: String,
        required: false
    },
    sanitizedHtml: {
        type: String,
        required: true
    },
    coverImageName: {
        type: String,
        require: false
    },
    parentArticle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Article',
        required: true
    },

    // test: {
    //     type: String,
    //     required: true
    // }
})

// The callback function runs every time whenever we save, update, create, delete ...
subArticleSchema.pre('validate', function (next) {
    // Convert our markdown to sanitized html
    if (this.markdown) {
        this.sanitizedHtml = dompurify.sanitize(marked(this.markdown))
    }
    next() // need to run it at the end
})



// subArticleSchema.virtual('coverImagePath').get(function () {
//     if (this.coverImageName != null) {

//         var parentArticle = this.populate('parentArticle')
//         console.log('---> folderName - ', parentArticle)

//         ArticleModel.findById(this.parentArticle, (err, parentArticle) => {
//             console.log('---> parentArticle - ', parentArticle.folderName)
//             let result = path.join('/', ArticleModel.coverImageBasePath, parentArticle.folderName, this.coverImageName)
//             console.log('---> parentArticle result - ', result)
//             return path.join('/', ArticleModel.coverImageBasePath, parentArticle.folderName, this.coverImageName)
//         })

//         // return path.join('/', )
//         // return path.join('/', coverImageBasePath, this.folderName, this.coverImageName)
//     }
// })



/*
    https://stackoverflow.com/questions/65931572/node-js-mongoose-create-a-blog-post-commenting-system

    router.post('/post/:id/comment', async (req, res) => {
        // find out which post you are commenting
        const id = req.params.id;
        // get the comment text and record post id
        const comment = new Comment({
            text: req.body.comment,
            post: id
        })
        // save comment
        await comment.save();
        // get this particular post
        const postRelated = await Post.findById(id);
        // push the comment into the post.comments array
        postRelated.comments.push(comment);
        // save and redirect...
        await postRelated.save(function (err) {
            if (err) { console.log(err) }
            res.redirect('/')
        })
    })
 */

module.exports = mongoose.model('SubArticle', subArticleSchema)
