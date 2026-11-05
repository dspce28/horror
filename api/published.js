// Public list of approved stories for the story wall.
const { readPublished } = require('./_store');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
  try {
    const { stories } = await readPublished();
    return res.status(200).json(stories.map(({ id, kind, name, city, story, lang }) => ({ id, kind, name, city, story, lang })));
  } catch (e) {
    console.error('read failed', e && e.message);
    return res.status(200).json([]);
  }
};
