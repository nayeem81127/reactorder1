const isAdmin = (req, res, next) => {
  if (req.user.role === 'admin') {
    return next();
  }
  res.redirect('/index');
};

const isAmazon = (req, res, next) => {
  if (req.user.has_access_of.includes('amazon')) {
    return next();
  }
  res.redirect('/index');
}

const isShopify = (req, res, next) => {
  if (req.user.has_access_of.includes('shopify')) {
    return next();
  }
  res.redirect('/index');
}

const isEbay = (req, res, next) => {
  if (req.user.has_access_of.includes('ebay')) {
    return next();
  }
  res.redirect('/index');
}

const isMajento = (req, res, next) => {
  if (req.user.has_access_of.includes('majento')) {
    return next();
  }
  res.redirect('/index');
}

const isWooCommerce = (req, res, next) => {
  if (req.user.has_access_of.includes('wooCommerce')) {
    return next();
  }
  res.redirect('/index');
}

const isBigCommerce = (req, res, next) => {
  if (req.user.has_access_of.includes('bigCommerce')) {
    return next();
  }
  res.redirect('/index');
}

const isEtsy = (req, res, next) => {
  if (req.user.has_access_of.includes('etsy')) {
    return next();
  }
  res.redirect('/index');
}

const isQuickBooks = (req, res, next) => {
  if (req.user.has_access_of.includes('quickBooks')) {
    return next();
  }
  res.redirect('/index');
}

const isAccess = (req, res, next) => {
  var here = "hello";
  /*
  if (req.user.has_access_of.includes('amazon')) {
    console.log("has_access_of amazon is working");
    var amaz = true;
    console.log("amaz" + amaz);
  }
  if (req.user.has_access_of.includes('shopify')) {
    console.log("has_access_of shopify is working");
    var shopify = true;
    console.log("shopify" + shopify);
  }
  if (req.user.has_access_of.includes('etsy')) {
    console.log("has_access_of etsy is working");
    var etsy = true;
    console.log("etsy" + etsy);
  }
  if (req.user.role === "admin") {
    console.log("access admin--->" + req.user.has_access_of);
    var manage = true;
  }
  if (req.user.role === "user") {
    console.log("access user--->" + req.user.has_access_of);
    var manage = false;
    console.log("2manage" + manage, "etsy" + etsy, "amaz" + amaz);
  }*/
  //res.render('index', { manage: manage, amaz: amaz, etsy: etsy, shopify: shopify });
}


module.exports = {
  isAdmin,
  isAmazon,
  isEbay,
  isMajento,
  isQuickBooks,
  isWooCommerce,
  isEtsy,
  isBigCommerce,
  isShopify
}