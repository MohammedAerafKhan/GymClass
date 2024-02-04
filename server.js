const express = require("express");
const app = express();
const HTTP_PORT = process.env.PORT || 8080;

// use a static resources folder
app.use(express.static('assets'))

// configure express to receive form field data
app.use(express.urlencoded({ extended: true }))

// setup handlebars
const exphbs = require("express-handlebars");
app.engine(".hbs", exphbs.engine({
  extname: ".hbs",
  helpers: {
      json: (context) => { return JSON.stringify(context) }
  }
}));
app.set("view engine", ".hbs");

// setup sessions
const session = require('express-session')
app.use(session({
   secret: "the quick brown fox jumped over the lazy dog 1234567890",  // random string, used for configuring the session
   resave: false,
   saveUninitialized: true
}))


const mongoose = require('mongoose');
mongoose.connect("mongodb+srv://mkhan331:331mkhan@cluster0.64ar327.mongodb.net/test");
const Schema = mongoose.Schema

const UsersSchema = new Schema({username:String, password:String})
const ClassesSchema = new Schema({imgName:String, className:String, lengthOfClass:Number})
const PaymentsSchema = new Schema({username:String, className:String, priceBeforeTax:Number, TotalAmtPaid:Number, dateCreated:Date})

/*
JSON array to inset the classes document into the Database
[
    {"imgName":"cycling.jpeg", "className":"cycling", "lengthOfClass":45},
    {"imgName":"pilates.jpeg", "className":"pilates", "lengthOfClass":50},
    {"imgName":"running.jpeg", "className":"running", "lengthOfClass":30},
    {"imgName":"swimming.jpeg", "className":"swimming", "lengthOfClass":10},
    {"imgName":"selfdefense.jpeg", "className":"selfdefense", "lengthOfClass":75}
]
*/

const Users = mongoose.model("users_Collection", UsersSchema)
const Classes = mongoose.model("classes_Collection", ClassesSchema)
const Payments = mongoose.model("payments_Collection", PaymentsSchema)

const adminusername = "admin"
const adminpassword = "00000000"

const calcprice = (classes) => {
    const newClassList = [];
    for (let i = 0; i < classes.length; i++) {
        const classWithPrice = {
            imgName: classes[i].imgName,
            className: classes[i].className,
            lengthOfClass: classes[i].lengthOfClass,
            price: classes[i].lengthOfClass * 0.65
        };
        newClassList.push(classWithPrice);
    }

    return newClassList;
}
 
//********************************* endpoints **********************************//

app.get("/", (req, res) => {    // login page
    console.log("[DEBUG]: Request received on / endpoint")
    res.render("loginpage", {layout:"basic", loggedIn:(req.session.username !== undefined)}) 
    return   
})

//********************************* classes endpoint **********************************//

app.get("/classes", async (req, res) => {
    console.log("[DEBUG]: Request received on /classes endpoint")
    const classToPrint = await Classes.find().lean()
    const classToSend = calcprice(classToPrint)
    res.render("classes", {layout:"basic", class:classToSend, loggedIn:(req.session.username !== undefined)})
    return
})

//********************************* adminpage endpoint **********************************//

app.get("/adminpage", async (req, res) => {
    console.log("[DEBUG]: Request received on /adminpage endpoint")
    const paymentsToPrint = await Payments.find().lean()
    res.render("adminpage", {layout:"basic", payments:paymentsToPrint, loggedInAdmin:(req.session.username === "admin"), loggedIn:(req.session.username !== undefined)})
    return
})

//********************************* cartpage endpoint **********************************//

app.get("/cartpage", async (req, res) => {
    console.log("[DEBUG]: Request received on /cartpage endpoint")
    if (req.session.username === undefined) {
        res.render("cartpage", {layout:"basic", loggedIn:false, isCartEmpty:req.session.isCartEmpty})
        return
    }
    else{
        res.render("cartpage", {layout:"basic", loggedIn:(req.session.username !== undefined), isCartEmpty:req.session.isCartEmpty, cartItems:req.session.cart.items})
        return
    }
})

//********************************* logout endpoint **********************************//

app.get("/logout", async (req, res) => {
    console.log("[DEBUG]: Request received on /logout endpoint")
    req.session.destroy()
    res.render("loginpage", {layout:"basic", loggedIn:false})   // after hitting logout we know that we are not logged in.
})

//****************************** createAcc endpoint ******************************//

app.post("/createAcc", async (req, res) => {    // login page
    console.log("[DEBUG]: Request received on /createAcc endpoint")
    const usernameFromForm = req.body.username
    const passwordFromForm = req.body.password

    try {
        if (usernameFromForm.length === 0 || passwordFromForm.length === 0) {
            const errmsg = "Both the fields are mandatory!"
            res.render("error", {layout:false, errormsg: errmsg})
            return
        }

        if (usernameFromForm.length<6 || passwordFromForm.length<6) {
            const errmsg = "The username and password should be more than 6 characters"
            res.render("error", {layout:false, errormsg: errmsg})
            return
        }

        const existingUser = await Users.findOne({username:usernameFromForm}).lean()
        if (existingUser !== null) {
            const errmsg = "You already have an account with us! please hit log in"
            res.render("error", {layout:false, errormsg: errmsg})
            return
        }
        else {
            const userToInsert = await Users({username:usernameFromForm, password:passwordFromForm})
            userToInsert.save()
            req.session.username = usernameFromForm
            req.session.cart = {items: []}
            req.session.isCartEmpty = true
            const classToPrint = await Classes.find().lean()
            const classToSend = calcprice(classToPrint)
            res.render("classes", {layout:"basic", class:classToSend, loggedIn:(req.session.username !== undefined)})
            return
        }

    } catch (err) {
        console.log(err)
    }
})

//****************************** login endpoint ******************************//

app.post("/login", async (req,res)=>{
    console.log(`[DEBUG] GET request received at /login endpoint`)
    const usernameFromForm = req.body.username
    const passwordFromForm = req.body.password

    if (usernameFromForm === adminusername && passwordFromForm === adminpassword) {
        req.session.cart = {items: []}
        req.session.isCartEmpty = true
        req.session.username = "admin"
        const paymentsToPrint = await Payments.find().lean()
        res.render("adminpage", {layout:"basic", payments:paymentsToPrint, loggedInAdmin:(req.session.username === "admin"), loggedIn:(req.session.username !== undefined)})
        return
    }

    try {
        if (usernameFromForm.length === 0 || passwordFromForm.length === 0) {
            const errmsg = "Both the fields are mandatory!"
            res.render("error", {layout:false, errormsg: errmsg})
            return
        }

        if (usernameFromForm.length<6 || passwordFromForm.length<6) {
            const errmsg = "The username and password should be more than 6 characters"
            res.render("error", {layout:false, errormsg: errmsg})
            return
        }

        const correctUser = await Users.findOne({username:usernameFromForm}).lean()

        if (correctUser === null) {
            const errmsg = "You are not registered with us, please create an account first"
            res.render("error", {layout:false, errormsg: errmsg})
            return
        }

        if (correctUser.password !== passwordFromForm) {
            const errmsg = "The password You entered is incorrect!"
            res.render("error", {layout:false, errormsg: errmsg})
            return
        }

        if (correctUser.username === usernameFromForm) {
            req.session.username = usernameFromForm
            req.session.cart = {items: []}
            req.session.isCartEmpty = true
            const classToPrint = await Classes.find().lean()
            const classToSend = calcprice(classToPrint)
            res.render("classes", {layout:"basic", class:classToSend, loggedIn:(req.session.username !== undefined)})
            return
        }

    } catch (err) {
        console.log(err)
    }
})

//****************************** goBack endpoint ******************************//

app.post("/goBack", (req,res)=>{
    console.log(`[DEBUG] GET request received at /goBack endpoint`)
    res.render("loginpage", {layout:"basic", loggedIn:(req.session.username !== undefined)})
    return
})

//****************************** bookNow endpoint ******************************//

app.post("/bookNow", async (req,res)=>{
    console.log(`[DEBUG] GET request received at /bookNow endpoint`)
    req.session.isCartEmpty = false
    
    try {
        if (req.session.username === undefined) {
            const errmsg = "You need to be logged in to book a class, please login or create an account to book a class"
            res.render("error", {layout:false, errormsg: errmsg})
            return
        }
        else {
            const bookedByUsername = req.session.username
            const bookedClassName = req.body.bookedClass
            const bookedClass = await Classes.findOne({className:bookedClassName}).lean()
            const lengthOfThisClass = bookedClass.lengthOfClass
            const priceBeforeTax = 0.65 * parseFloat(lengthOfThisClass) 
            const total = (priceBeforeTax * 0.13) + priceBeforeTax
            const dateCreated = Date()

            const paymentToInsert = await Payments({username:bookedByUsername, className:bookedClassName, priceBeforeTax:priceBeforeTax.toFixed(2), TotalAmtPaid:total.toFixed(2), dateCreated:dateCreated})
            paymentToInsert.save()

            const cartListToAppend = {username:bookedByUsername, className:bookedClassName, lengthofCLass:lengthOfThisClass, subTotal:priceBeforeTax.toFixed(2), totalcost:total.toFixed(2)}
            req.session.cart.items.push(cartListToAppend)
        }

        const classToPrint = await Classes.find().lean()
        let price = []
        for(let i = 0; i < classToPrint.length; i++) {
            price.push(classToPrint.lengthOfClass * 0.65)
        }
        const classToSend = calcprice(classToPrint)
        res.render("classes", {layout:"basic", class:classToSend, loggedIn:(req.session.username !== undefined)}) 
        return
        
    } catch (err) {
        console.log(err)
    }
})


//-------------------start server---------------------//
const onHttpStart = () => {
    console.log("Express http server listening on: " + HTTP_PORT);
    console.log(`http://localhost:${HTTP_PORT}`);
   }
   app.listen(HTTP_PORT, onHttpStart);