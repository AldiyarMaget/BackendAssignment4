exports.renderHome = (req, res) => {
    res.status(200).render('index', { title: 'Measurement' });
};
