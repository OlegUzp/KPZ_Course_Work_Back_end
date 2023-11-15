const isEmpty = (value) => {
    return value.trim().length === 0
}
const isEmail = (email) => {
    const validateEmailRegex = /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
    return validateEmailRegex.test(email); 
}
exports.validateSignupData = (newUser) => {
    let errors = {};
    if(isEmpty(newUser.email)) errors.email = 'Must not be empty'
    else if(!isEmail(newUser.email)) errors.email = 'Must be valid'
    if(isEmpty(newUser.password)) errors.password = 'Must not be empty'
    else if(newUser.password.length < 6) errors.password = 'Must have length >= 6'
    if(newUser.password !== newUser.confirmPassword) errors.confirmPassword = 'Confirmatiom must be equal to password'
    if(isEmpty(newUser.handle)) errors.handle = 'Must not be empty'
    return {errors,valid: Object.keys(errors)>0 ? true : false}
}
exports.validateLoginData = (user) => {
    let errors = {};
    if(isEmpty(user.email)) errors.email = 'Must not be empty'
    else if(!isEmail(user.email)) errors.email = 'Must be valid'
    if(isEmpty(user.password)) errors.password = 'Must not be empty'
    else if(user.password.length<6) errors.password = 'Must have length >= 6'
    return {errors,valid: Object.keys(errors)>0 ? true : false}
}
exports.reduceUserDetails = (data) => {
    let userDetails = {};

    if (data.bio && !isEmpty(data.bio.trim())) {
        userDetails.bio = data.bio.trim();
    }

    if (data.website && !isEmpty(data.website.trim())) {
        let trimmedWebsite = data.website.trim();
        if (trimmedWebsite.substring(0, 4) !== 'http') {
            userDetails.website = `http://${trimmedWebsite}`;
        } else {
            userDetails.website = trimmedWebsite;
        }
    }

    if (data.location && !isEmpty(data.location.trim())) {
        userDetails.location = data.location.trim();
    }

    return userDetails;
}