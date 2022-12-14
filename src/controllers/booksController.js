const reviewModel = require("../models/reviewModel")
const booksModel = require("../models/booksModel")
const validator = require('../validator/validator')


// --------------------------------------------------------- REGEX --------------------------------------------------------------

const stringRegex = /^[ a-z ]+$/i
const isbn10 = /^(?=(?:\D*\d){7}(?:(?:\D*\d){3})?$)[\d-]+$/
const isbn13 = /^(?=(?:\D*\d){10}(?:(?:\D*\d){3})?$)[\d-]+$/

// ------------------------------------------------------ CREATE BOOKS ----------------------------------------------------------

const bookCreation = async function (req, res) {
    try {
        let requestBody = req.body;
        const { title, excerpt, userId, ISBN, category, subcategory, releasedAt } = requestBody

        if (!validator.isValidRequestBody(requestBody)) {
            return res.status(400).send({ status: false, message: 'Invalid request parameters. Please provide book details' })
        }
        if (!title) {
            return res.status(400).send({ status: false, message: "Title is required" })
        };
        if (!validator.isValid(title)) {
            return res.status(400).send({ status: false, message: "Title is in wrong format" })
        };

        if (!excerpt) {
            return res.status(400).send({ status: false, message: "excerpt is required" })
        };
        if (!validator.isValid(excerpt)) {
            return res.status(400).send({ status: false, message: "excerpt is in wrong format" })
        };

        if (!userId) {
            return res.status(400).send({ status: false, message: "userId is required" })
        };
        if (!validator.isValid(userId)) {
            return res.status(400).send({ status: false, message: "userId is in wrong format" })
        };
        if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).send({ status: false, message: "Incorrect userId format" })
        }

        if (userId != req.token.userId) {
            return res.status(403).send({
                status: false,
                message: "Unauthorized access ! User's credentials do not match."
            })
        }
        if (!ISBN) {
            return res.status(400).send({ status: false, message: "ISBN is required" })
        };
        if (!validator.isValid(ISBN)) {
            return res.status(400).send({ status: false, message: "ISBN is in wrong format" })
        };
        if (!ISBN.match(isbn10) && !ISBN.match(isbn13)) {
            return res.status(400).send({ status: false, message: "Please provide correct format for ISBN" })
        };

        if (!category) {
            return res.status(400).send({ status: false, message: "category is required" })
        };
        if (!validator.isValid(category)) {
            return res.status(400).send({ status: false, message: "category is in wrong format" })
        };
        if (!category.match(stringRegex)) {
            return res.status(400).send({ status: false, message: "category cannot contain numbers" })
        };

        if (!subcategory) {
            return res.status(400).send({ status: false, message: "subcategory is required" })
        };
        if (typeof subcategory != "object" && typeof subcategory != "string") {
            return res.status(400).send({ status: false, message: "subcategory is in wrong format" })
        };

        if (!releasedAt) {
            return res.status(400).send({ status: false, message: "releasedAt is required" })
        };
        if (!validator.isValid(releasedAt)) {
            return res.status(400).send({ status: false, message: "releasedAt is in wrong format" })
        };
        if (!validator.isValidDate(releasedAt)) {
            return res.status(400).send({ status: false, message: "releasedAt is in incorrect format (YYYY-MM-DD)" })
        }
        //searching title & ISBN in database to maintain their uniqueness.
        let checkBook = await booksModel.findOne({ title: title })
        if (checkBook) {
            return res.status(400).send({ status: false, message: "Title already used" })
        }
        let checkBook2 = await booksModel.findOne({ ISBN: ISBN })
        if (checkBook2) {
            return res.status(400).send({ status: false, message: "ISBN already used" })
        }

        const newBook = await booksModel.create(requestBody);
        return res.status(201).send({ status: true, message: "Book created successfully", data: newBook })
    } catch (error) {
        return res.status(500).send({ status: false, message: error.message })
    }
}

// ------------------------------------------------------ GET ALL BOOKS ---------------------------------------------------------

const getAllBook = async function (req, res) {

    try {

        const queryParams = req.query
        if (queryParams.userId && !queryParams.userId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).send({ status: false, message: "Incorrect userId" })
        }      

        const books = await booksModel.find({ ...queryParams, isDeleted: false }).sort({ title: 1 }).select('_id title excerpt userId category releasedAt reviews')
        books.sort((a, b) => a.title.localeCompare(b.title))  // enables case - insenstive and then sort the array

        if (books && books.length == 0) {
            return res.status(404).send({ status: false, message: "Books not found" })
        }
        return res.status(200).send({ status: true, message: "Books list", data: books })

    }
    catch (error) {
        return res.status(500).send({ status: false, message: error.message })

    }
}

// ----------------------------------------------------- GET /books/:bookId -----------------------------------------------------

const getBooksById = async function (req, res) {
    try {
        const bookId = req.params.bookId;
        if (!bookId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).send({ status: false, message: "Incorrect Book Id format" })
        }

        const allData = await booksModel.findOne({ _id: bookId, isDeleted: false })
        if (!allData) {
            return res.status(404).send({ status: false, message: "Book doesn't exists...!" })
        }
        const reviews = await reviewModel.find({ bookId: allData._id, isDeleted: false }).select({
            _id: 1,
            bookId: 1,
            reviewedBy: 1,
            reviewedAt: 1,
            rating: 1,
            review: 1
        })

        const data = allData.toObject()  //to change mongoose document into objects (.toObject() is a function in mongoose)
        data["reviewsData"] = reviews

        return res.status(200).send({ status: true, message: "Books List", data: data })

    } catch (err) {
        return res.status(500).send({ status: false, message: err.message })
    }
}

//  ---------------------------------------------------- PUT /books/:bookId -----------------------------------------------------

const updateBook = async function (req, res) {
    try {
        let bookId = req.params.bookId
        if (!bookId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).send({ status: false, message: "Incorrect Book Id format" })
        }

        let book = await booksModel.findById(bookId)
        if (!book || book.isDeleted == true) {
            return res.status(404).send({ status: false, message: "No Book Found" })
        }
        if (req.token.userId != book.userId) {
            return res.status(403).send({ status: false, message: "Not Authorised" })
        }
        if (!validator.isValidRequestBody(req.body)) {
            return res.status(400).send({ status: false, message: "Body is empty, please Provide data" })
        };

        let { title, excerpt, releasedAt, ISBN } = req.body
        if (title) {
            if (!validator.isValid(title)) {
                return res.status(400).send({ status: false, message: "Title is in incorrect format" })
            };
            let checkBook = await booksModel.findOne({ title })
            if (checkBook) {
                return res.status(400).send({ status: false, message: "Title already used" })
            }
        }
        if (excerpt && !validator.isValid(excerpt)) {
            return res.status(400).send({ status: false, message: "Excerpt is in incorrect format" })
        };
        if (ISBN) {
            if (!validator.isValid(ISBN)) {
                return res.status(400).send({ status: false, message: "ISBN is in incorrect format" })
            };
            if (!ISBN.match(isbn10) && !ISBN.match(isbn13)) {
                return res.status(400).send({ status: false, message: "ISBN is in wrong format" })
            };
            let checkBook2 = await booksModel.findOne({ ISBN })
            if (checkBook2) {
                return res.status(400).send({ status: false, message: "ISBN already used" })
            }
        }
        if (releasedAt) {
            if (!validator.isValid(releasedAt) || !validator.isValidDate(releasedAt)) {
                return res.status(400).send({ status: false, message: "releasedAt is in incorrect format..! Required (YYYY-MM-DD)" })
            };
        }

        let updatedBook = await booksModel.findOneAndUpdate({ _id: bookId }, { title, excerpt, releasedAt, ISBN }, { new: true })

        return res.status(200).send({ status: true, message: "Success", data: updatedBook })
    } catch (error) {
        res.status(500).send({ status: false, message: error.message })
    }
}

// --------------------------------------------------- DELETE /books/:booksId ---------------------------------------------------

const deleteBooksById = async function (req, res) {
    try {
        const booksId = req.params.bookId
        if (!booksId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).send({ status: false, message: "Incorrect Book Id format" })
        }

        let book = await booksModel.findById(booksId)
        if (!book || book.isDeleted == true) {
            return res.status(404).send({ status: false, message: "No such book exist" })
        };
        if (req.token.userId != book.userId) {
            return res.status(403).send({ status: false, message: "Not Authorised" })
        }

        await booksModel.findOneAndUpdate({ _id: booksId }, { isDeleted: true, deletedAt: new Date() })
        return res.status(200).send({ status: true, message: "Book deleted successfully" })


    } catch (err) {
        return res.status(500).send({ status: false, message: err.message })
    }
}

module.exports = { bookCreation, getAllBook, getBooksById, updateBook, deleteBooksById }

