const express = require('express')
const router = express.Router()
const path = require('path')
const fs = require('fs')

const moveFile = require('move-file');

// Get mongoose model for Article collection
const Article = require('./../models/article')
// Get mongoose model for SubArticle collection
const SubArticle = require('./../models/subArticle')


/* Allows to work with files (images) */
const multer = require('multer')
// Set up multer
const uploadPath = path.join('public', Article.coverImageBasePath) // create path where to save image on the server
const imagesMimeTypes = ['image/jpeg', 'image/png', 'image/gif'] // set up allowed image types
const storage = multer.diskStorage({ // Configuring appropriate storage 
    destination: function (req, file, cb) {
        cb(null, uploadPath)
    },
    filename: function (req, file, cb) {
        const imgExtension = file.mimetype.split('/')[1]
        cb(null, file.fieldname + '-' + Date.now() + '.' + imgExtension)
        // console.log(file)
    }
})
const multerUpload = multer({
    // dest: uploadPath,
    storage: storage,
    fileFilter: (req, file, callback) => {
        // 1st param - error object
        // 2nd param {boolean} allowed image types
        callback(null, imagesMimeTypes.includes(file.mimetype))
    }
})
const multerArticlesFields = [
    {
        name: 'ArticleCover',
        maxCount: 1
    },
    {
        name: 'coverDB',
        maxCount: 1
    }
]
const multerSubArticlesFields = [
    {
        name: 'SubArticleCover',
        maxCount: 1
    }
]






/***************************************************************************/
/******************************* SubArticles *******************************/
/***************************************************************************/

/**
 * @description Form action to Delete the subArticle ( _method="DELETE" )
 */
router.delete('/articles/subarticle/:id', async (req, res) => {

    // Find the subArctile
    let subArticle = null
    try {
        subArticle = await SubArticle.findById(req.params.id)
    } catch (err) {
        console.error('--->> Can\'t find the subArticle in order to detele it: ', err)
    }

    // Populate the parentArticle
    try {
        await subArticle.populate('parentArticle').execPopulate()
    } catch (err) {
        console.error('--->> Can\'t populate the parentArticle in order to detele the subArticle: ', err)
    }

    // Remove subArticle's cover from the server
    if (subArticle != null && subArticle.coverImageName != null) {
        let articleFolderPath = path.join(uploadPath, subArticle.parentArticle.folderName)
        removeArticleCover2(articleFolderPath, subArticle.coverImageName)
    }

    // Delete the subArticle from the DB
    let deletedSubArticle = null
    try {
        if (subArticle != null) {
            deletedSubArticle = await SubArticle.findByIdAndDelete(subArticle.id)
        }
    } catch (err) {
        console.error('--->> Can\'t findOneAndDelete the subArticle: ', err)
    }

    // Delete the subArticle from the parentArticle's array
    if (deletedSubArticle != null) {
        subArticle.parentArticle.subArticles.pull(deletedSubArticle.id)
        try {
            await subArticle.parentArticle.save()
        } catch (err) {
            console.error('--->> Can\'t pull the subArticle form parentArticle\'s array: ', err)
        }
    }

    // Redirect
    let redirectRoute = '/'
    if (subArticle != null) {
        redirectRoute = `/articles/${subArticle.parentArticle.slug}`
    }
    res.redirect(redirectRoute)
})


/**
 * @description Page for creating a new SubArticle
 */
router.get('/articles/subarticle/new', async (req, res) => {
    // Find the Article by id
    let article = null
    try {
        article = await Article.findById(req.query.parentArticleId)
    } catch (err) {
        console.error('--->> Can\'t find the Article by id: ', err)
    }

    res.render('subArticles/new', {
        article,
        subArticle: new SubArticle(), // создаём пустую под-статью для темплейта, что б не было ошибок
        parentArticleId: req.query.parentArticleId, //  for form action
        pageRoute: 'new'
    })
})


// articles/one/subarticle/1

/**
 * @description Page for viewing the SubArticle
 */
/*
http://localhost:5000/articles/one/subarticle/1
*/
router.get('/articles/:parentArticleSlug/subarticle/:subArticleIndex', async (req, res) => {
    // Find the Article by slug
    let article = null
    try {
        article = await Article.findOne({
            slug: req.params.parentArticleSlug
        })
    } catch (err) {
        console.error('---> Can\'t find the Article by slug: ', err)
    }
    if (article == null) res.redirect('/')

    // Pupulate the subArticles
    let subArticles = null
    if (article != null) {
        try {
            await article.populate('subArticles').execPopulate()
            subArticles = article.subArticles
        } catch (err) {
            console.error('---> Can\'t populate the subArticles: ', err)
        }
    }
    if (subArticles == null) res.redirect('/')

    // Get subArticle index
    let subArticleIndex = parseInt(req.params.subArticleIndex)

    // Get subArticle by the index
    let subArticle = null
    subArticle = subArticles[subArticleIndex]
    if (subArticle === undefined) {
        subArticle = null
        // if (subArticles == null) res.redirect('/')
    }

    // Set next button url
    let nextBtnUrl = null
    let nextSubArticle = subArticles[subArticleIndex + 1]
    if (nextSubArticle !== undefined) {
        nextBtnUrl = `/articles/${article.slug}/subarticle/${subArticleIndex + 1}`
    } else {
        // Alternative link when there is no next sub article
        // nextBtnUrl = `/articles/${article.slug}`
    }

    // Set prev button url
    let prevBtnUrl = null
    let prevSubArticle = subArticles[subArticleIndex - 1]
    if (prevSubArticle !== undefined) {
        prevBtnUrl = `/articles/${article.slug}/subarticle/${subArticleIndex - 1}`
    } else {
        // Alternative link when there is no prev sub article
        // nextBtnUrl = `/articles/${article.slug}`
    }

    res.render('subArticles/show', {
        article,
        subArticle,
        subArticleIndex,
        nextBtnUrl,
        prevBtnUrl,
    })
})


/**
 * @description Page for viewing the SubArticle
 */
router.get('/articles/subarticle/:id', async (req, res) => {
    // Find the subArticle by id
    let subArticle = null
    try {
        subArticle = await SubArticle.findById(req.params.id)
    } catch (err) {
        console.error('---> Can\'t get the subArticle: ', err)
    }

    if (subArticle == null) res.redirect('/')

    // Populate the parentArticle
    let parentArticle = null
    if (subArticle != null) {
        try {
            await subArticle.populate('parentArticle').execPopulate()
            parentArticle = subArticle.parentArticle
        } catch (err) {
            console.error('---> Can\'t populate the parentArticle: ', err)
        }
    }

    if (parentArticle == null) res.redirect('/')

    // Find the subArticle index in the parent's array
    let subArticleIndex = null
    parentArticle.subArticles.forEach((arrayArticle, arrayArticleIndex) => {
        if (arrayArticle._id.toString() === subArticle._id.toString()) {
            subArticleIndex = arrayArticleIndex
        }
    })

    // Get next button url
    let nextBtnUrl = null
    let nextSubArticle = undefined
    if (subArticleIndex !== null) {
        nextSubArticle = parentArticle.subArticles[subArticleIndex + 1]
    }
    if (typeof nextSubArticle !== 'undefined') {
        let nextSubArticleId = nextSubArticle._id.toString()
        nextBtnUrl = `/articles/subarticle/${nextSubArticleId}`
    }

    // Get previous button url
    let prevBtnUrl = null
    let prevSubArticle = undefined
    if (subArticleIndex !== null) {
        prevSubArticle = parentArticle.subArticles[subArticleIndex - 1]
    }
    if (typeof prevSubArticle !== 'undefined') {
        let prevSubArticleId = prevSubArticle._id.toString()
        prevBtnUrl = `/articles/subarticle/${prevSubArticleId}`
    }

    res.render('subArticles/show', {
        article: subArticle.parentArticle,
        subArticle,
        subArticleIndex,
        nextBtnUrl,
        prevBtnUrl
    })
})


/**
 * @description Route to display the page with form for editing an existing sub article
 */
router.get('/articles/subarticle/edit/:id', async (req, res) => {

    // Find the subArticle by id
    let subArticle = null
    try {
        subArticle = await SubArticle.findById(req.params.id)
    } catch (err) {
        console.error('---> Can\'t get the subArticle: ', err)
    }

    // Populate the parentArticle
    try {
        await subArticle.populate('parentArticle').execPopulate()
    } catch (err) {
        console.error('---> Can\'t populate the parentArticle: ', err)
    }

    if (subArticle == null || subArticle.parentArticle == null) res.redirect('/')

    res.render('subArticles/edit', {
        subArticle: subArticle,
        article: subArticle.parentArticle,
        parentArticleId: subArticle.parentArticle.id, // for form action
        pageRoute: 'edit'
    })
})


/**
 * @description Form action for creating a new SubArticle
 */
router.post('/articles/subarticle/new', multerUpload.fields(multerSubArticlesFields), async (req, res, next) => { // '/articles/subarticle/new'
    req.subArticle = new SubArticle()
    next()
}, SaveUpdateSubArticleHandler('new'))


/**
 * @description Form action for creating a new SubArticle
 */
router.put('/articles/subarticle/edit/:id', multerUpload.fields(multerSubArticlesFields), async (req, res, next) => { // '/articles/subarticle/new'
    // Find the SubArticle for editing
    let subArticle = null
    try {
        subArticle = await SubArticle.findById(req.params.id)
    } catch (err) {
        console.error('--->> Can\'t find the subArticle by id for editing: ', err)
    }

    req.subArticle = subArticle

    next()
}, SaveUpdateSubArticleHandler('edit'))


function SaveUpdateSubArticleHandler(pageRoute) {
    return async (req, res, next) => {
        let newSubArticle;

        if (pageRoute === 'new') {
            newSubArticle = new SubArticle({
                markdown: req.body.markdown,
                parentArticle: req.query.parentArticleId
            })
        } else if (pageRoute === 'edit') {
            newSubArticle = req.subArticle;
            newSubArticle.markdown = req.body.markdown
        }

        // Get and set the cover image
        let subArticleCover = null
        let subArticleCoverImageNameOld = null
        if (req.files) {
            subArticleCover = req.files['SubArticleCover'] ? req.files['SubArticleCover'][0] : null
            if (subArticleCover != null) {
                if (newSubArticle.coverImageName != null) {
                    subArticleCoverImageNameOld = newSubArticle.coverImageName
                }
                newSubArticle.coverImageName = subArticleCover.filename
            }
        }

        // Get the paretn Article
        let parentArticle = null
        let articleFolderPath = null
        try {
            parentArticle = await Article.findById(req.query.parentArticleId)
            articleFolderPath = path.join(uploadPath, parentArticle.folderName)
        } catch (err) {
            console.error('---> Can\'t get the parentArticle: ', err)
            res.render(`subArticles/${pageRoute}`, {
                subArticle: newSubArticle,
                parentArticleId: req.query.parentArticleId,
                pageRoute: pageRoute,
                errorMessage: JSON.stringify(err)
            })
            // remove the SubArticle's image [if error]
            if (subArticleCover != null) {
                removeArticleCover2(uploadPath, newSubArticle.coverImageName)
            }
            return
        }

        // Save the newSubArticle to DB
        try {
            newSubArticle = await newSubArticle.save() // Save and get updated newSubArticle object with new 'id'
        } catch (err) {
            console.error('---> Can\'t save the newSubArticle: ', err)
            // remove the SubArticle's image [if error]
            if (subArticleCover != null) {
                removeArticleCover2(uploadPath, newSubArticle.coverImageName)
            }
            res.render(`subArticles/${pageRoute}`, {
                subArticle: newSubArticle,
                parentArticleId: req.query.parentArticleId,
                pageRoute: pageRoute,
                errorMessage: JSON.stringify(err)
            })
            return
        }

        // Is remove the cover image [when checkbox checked]
        if (req.body.isRemoveCover === 'yes') {
            // if we have the image to remove and don't upload a new image [otherwise it will be removed further]
            if (subArticleCover == null && newSubArticle.coverImageName != null) {
                removeArticleCover2(articleFolderPath, newSubArticle.coverImageName)
                newSubArticle.coverImageName = null
                try {
                    newSubArticle = await newSubArticle.save()
                } catch (err) {
                    console.error('---> Can\'t save the newSubArticle\'s coverImageName: ', err)
                }
            }
        }

        // Move a new sub article image to the Article's folder
        if (subArticleCover != null) {
            if (fs.existsSync(articleFolderPath)) {
                // remove old SubArticle's image
                if (subArticleCoverImageNameOld != null) {
                    removeArticleCover2(articleFolderPath, subArticleCoverImageNameOld)
                }

                // move a new SubArticle's image to other folder [if exists]
                let initialImagePath = path.join(uploadPath, newSubArticle.coverImageName)
                let updatedImagePath = path.join(articleFolderPath, newSubArticle.coverImageName)
                if (fs.existsSync(initialImagePath)) {
                    try {
                        await moveFile(initialImagePath, updatedImagePath)
                    } catch (err) {
                        console.error('---> Can\'t move the subArticle cover to other folder: ', err)
                    }
                }
            }
        }

        // Save new SubArticle to the paretn Article
        if (pageRoute === 'new') {
            parentArticle.subArticles.push(newSubArticle)
            try {
                parentArticle = await parentArticle.save()
            } catch (err) {
                console.error('---> Can\'t save the newSubArticle to parent Article: ', err)
            }
        }
        res.redirect(`/articles/subarticle/${newSubArticle.id}`)
    }
}


// TEST
// router.post('/subarticle/test', multerUpload.fields(multerArticlesFields), async (req, res) => { // '/articles/subarticle/new'
//     console.log('req.body.artur = ', req.body.artur)
//     res.send(`req.body.artur = ${req.body.artur}`)
// })

/***************************************************************************/
/*************************** end SubArticles *******************************/
/***************************************************************************/
















/***************************************************************************/
/*************************** start Articles *******************************/
/***************************************************************************/


/**
 * @description Show all articles
 */
router.get('/articles', (req, res) => {
    res.redirect('/') // from '/articles' to '/'
})


/**
 * @description Route to dispay the page with form for creating a new article
 */
router.get('/articles/new', (req, res) => {
    // res.send('In articles')

    res.render('articles/new', {
        article: new Article(), // создаём пустую статью для темплейта, что б не было ошибок
        pageRoute: 'new'
    })
})


/**
 * @description Route to display the page with form for editing an existing article
 */
router.get('/articles/edit/:id', async (req, res) => {
    // Find the Article for editing
    let editArticle = null
    try {
        editArticle = await Article.findById(req.params.id)
    } catch (err) {
        console.error('--->> Can\'t find the Article by id for editing: ', err)
    }

    if (editArticle == null) res.redirect('/')

    res.render('articles/edit', {
        article: editArticle,
        pageRoute: 'edit'
    })
})


/**
 * @description Route to display the article page
 */
router.get('/articles/:slug', async (req, res) => {
    // Find the Article by slug
    let article = null
    try {
        article = await Article.findOne({
            slug: req.params.slug
        })
    } catch (err) {
        console.error('--->> Can\'t find the Article by slug for showing: ', err)
    }

    // Pupulate the subArticles ref
    if (article != null) {
        try {
            await article.populate('subArticles').execPopulate()
        } catch (err) {
            console.error('--->> Can\'t populate the subArticles of the Article for showing: ', err)
        }
    }

    if (article == null) res.redirect('/')

    res.render('articles/show', {
        article: article
    })
})


/**
 * @description Form action to Delete an article ( _method="DELETE" )
 */
router.delete('/articles/:id', async (req, res) => {

    // Find the Article
    let article = null
    try {
        article = await Article.findById(req.params.id)
    } catch (err) {
        console.error('---> Can\'t find the Article in order to detele it: ', err)
    }

    // Populate the subArticles
    try {
        await article.populate('subArticles').execPopulate()
    } catch (err) {
        console.error('--->> Can\'t populate the subArticles in order to detele them: ', err)
    }

    // Loop throught the subArticles and delete them
    if (article != null && article.subArticles.length) {
        while (article.subArticles.length > 0) {
            let subArticle = article.subArticles.$pop()
            // console.log('subArticle = ', subArticle)
            if (subArticle == null) continue
            
            // Remove subArticle's cover from the server
            if (subArticle != null && subArticle.coverImageName != null) {
                let articleFolderPath = path.join(uploadPath, article.folderName)
                removeArticleCover2(articleFolderPath, subArticle.coverImageName)
            }

            // Delete the subArticle from the DB
            let deletedSubArticle = null
            try {
                deletedSubArticle = await SubArticle.findByIdAndDelete(subArticle._id)
            } catch (err) {
                console.error('--->> Can\'t findOneAndDelete the subArticle: ', err)
            }
            // console.log('deletedSubArticle = ', deletedSubArticle)

            // Save the parentArticle after loop in order to update the array [$pop()]
            try {
                await article.save()
            } catch (err) {
                console.error('--->> Can\'t pull the subArticle form parentArticle\'s array: ', err)
            }
        }
    }


    /* Handle the Article deletion */

    // Delete the Article
    let deletedArticle = null
    try {
        deletedArticle = await Article.findByIdAndDelete(req.params.id)
    } catch (err) {
        console.error('---> Can\'t find by id and delete the Article: ', err)
    }

    // Get Article's folder path
    let deletedArticleFolderPath = ''
    if (deletedArticle != null) {
        deletedArticleFolderPath = path.join(uploadPath, deletedArticle.folderName)
    }

    // Delete the Article's cover image
    if (deletedArticle != null && deletedArticle.coverImageName != null) {
        removeArticleCover2(deletedArticleFolderPath, deletedArticle.coverImageName)
    }

    // Delete the Article's folder
    if (deletedArticle != null) {
        if (fs.existsSync(deletedArticleFolderPath)) {
            fs.rmdirSync(deletedArticleFolderPath, { recursive: true })
        }
    }

    res.redirect('/')
    // res.redirect(`/articles/${article.slug}`)
})


/**
 * @description Form action to Create new article
 */
// multerUpload.single('cover') - the 'cover' is a name of input in form
// multerUpload.fields(multerArticlesFields) - use multiple fields [req.files]
router.post('/articles/new', multerUpload.fields(multerArticlesFields), async (req, res, next) => {
    req.article = new Article()
    next()
}, saveArticleAndRedirect('new'))


/**
 * @description Form action to Edit an article
 */
// multerUpload.single('cover') - the 'cover' is a name of input in form
// multerUpload.fields(multerArticlesFields) - use multiple fields [req.files]
router.put('/articles/:id', multerUpload.fields(multerArticlesFields), async (req, res, next) => {
    
    // Find the Article by id
    let article = null
    try {
        article = await Article.findById(req.params.id)
    } catch (err) {
        console.error('--->> Can\'t find the Article by id: ', err)
    }

    req.article = article

    next()
}, saveArticleAndRedirect('edit'))


/**
 * @description Incapsulate the functionality for Creating and Editing an Article in one function
 */
function saveArticleAndRedirect(route) {
    return async (req, res, next) => {
        let article = req.article
        article.title = req.body.title
        article.description = req.body.description
        article.markdown = req.body.markdown
        article.folderName = req.body.folderName

        /* Handle the Cover Image */
        // multer adds the 'file' object to the 'req' [if one file]
        // multer adds the 'files' object to the 'req' [if multiple files]
        let cover = null
        if (req.files) {
            cover = req.files['ArticleCover'] ? req.files['ArticleCover'][0] : null
        }

        try {
            article = await article.save() // Here save and get updated article object with new 'id'
        } catch (err) {
            console.error('---> saveArticleAndRedirect() - Can\'t save the Article: ', err)

            // Remove the image from server if something went wrong
            if (cover != null) {
                removeArticleCover2(uploadPath, cover.filename)
            }

            res.render(`articles/${route}`, {
                article: article,
                pageRoute: route,
                errorMessage: JSON.stringify(err) // 'Something went wrong'
            })

            return
        }

        // the 'new' article route
        if (route === 'new') {
            if (cover != null) {
                article.coverImageName = cover.filename
                try {
                    article = await article.save()
                } catch (err) {
                    console.error('---> saveArticleAndRedirect() - Can\'t save the Article\'s new coverImageName: ', err)
                }
            }
        }

        // the 'edit' acrticle route
        if (route === 'edit') {
            if (cover != null) {
                // if we got new image and we have already had the image before THEN remove it from the server
                if (article.coverImageName) {
                    removeArticleCover2(path.join(uploadPath, article.folderName), article.coverImageName)
                }
                // add the new cover image name to DB
                article.coverImageName = cover.filename
                try {
                    article = await article.save()
                } catch (err) {
                    console.error('---> saveArticleAndRedirect() - Can\'t save the Article\'s edited coverImageName: ', err)
                }
            }

            // Is remove the cover image from the file system
            if (req.body.isRemoveCover === 'yes') {
                if (cover == null && article.coverImageName != null) {
                    removeArticleCover2(path.join(uploadPath, article.folderName), article.coverImageName)
                    article.coverImageName = null
                    try {
                        article = await article.save()
                    } catch (err) {
                        console.error('---> saveArticleAndRedirect() - Can\'t set to null the Article\'s coverImageName: ', err)
                    }
                }
            }
        }

        // Move cover image to special folder
        if (cover != null && article.coverImageName != null) {
            // create new folder for the image (if not exists)
            let articleFolderPath = path.join(uploadPath, article.folderName)
            if (!fs.existsSync(articleFolderPath)) {
                try {
                    fs.mkdirSync(articleFolderPath)
                } catch (err) {
                    console.error('---> saveArticleAndRedirect() - Can\'t make a new folder for the Article\'s cover: ', err)
                }
            }

            // move the image to other folder (if exists)
            let initialImagePath = path.join(uploadPath, article.coverImageName)
            let updatedImagePath = path.join(articleFolderPath, article.coverImageName)
            if (fs.existsSync(initialImagePath)) {
                try {
                    await moveFile(initialImagePath, updatedImagePath)
                } catch (err) {
                    console.error('---> saveArticleAndRedirect() - Can\'t move the Article\'s cover to other folder: ', err)
                }
            }
        }

        res.redirect(`/articles/${article.slug}`)
    }
}

function removeArticleCover2(folderPath, fileName) {
    if (fileName === null || typeof fileName === 'undefined') return
    if (folderPath === null || typeof folderPath === 'undefined') return

    let fullImagePath = path.join(folderPath, fileName)
    if (fs.existsSync(fullImagePath)) {
        fs.unlink(fullImagePath, err => {
            if (err) {
                console.error('Cant remove the cover image: ', err)
            }
            console.info('[removeArticleCover2] removed the cover: ', fileName)
        })
    }
}

// Original function
function removeArticleCover(fileName) {
    if (fileName === null || typeof fileName === 'undefined') return
    fs.unlink(path.join(uploadPath, fileName), err => {
        if (err) {
            console.error('Cant remove the cover image: ', err)
        }
        console.info('[removeArticleCover] Removed cover: ', fileName)
    })
}

function removeFile(filePath) {
    if (filePath === null) return
    fs.unlink(filePath, err => {
        if (err) {
            console.error('Cant remove the file: ', err)
        }
        console.info('[removeFile] Removed file: ', filePath)
    })
}

/***************************************************************************/
/*************************** end Articles *******************************/
/***************************************************************************/

module.exports = router
