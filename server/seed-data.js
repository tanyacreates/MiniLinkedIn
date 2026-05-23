// Rich demo-data seeder for Mini-LinkedIn.
// Creates professional users and a populated feed (posts with media, likes,
// comments and shares) so the platform looks like a real social network.
//
// Idempotent: removes previously seeded demo users (firebaseUid starting with
// "demo-") and their posts before reseeding. Real Firebase-created accounts and
// their posts are left untouched.
require('dotenv').config();
const crypto = require('crypto');
const mongoose = require('mongoose');

const User = require('./models/User');
const Post = require('./models/Post');

const avatar = (name) =>
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundType=gradientLinear`;
const postImg = (seed) => `https://picsum.photos/seed/${encodeURIComponent(seed)}/800/450`;

const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];
const sample = (arr, n) => [...arr].sort(() => 0.5 - Math.random()).slice(0, n);
const daysAgo = (d) => new Date(Date.now() - d * 24 * 60 * 60 * 1000);

const usersData = [
    { name: 'Aarav Sharma', headline: 'Senior Software Engineer @ TechCorp', bio: 'Building scalable web apps. React, Node, AWS. Always learning.' },
    { name: 'Priya Verma', headline: 'Data Scientist | ML Enthusiast', bio: 'Turning data into decisions. Python, TensorFlow, and lots of coffee.' },
    { name: 'Rohan Mehta', headline: 'Mobile Developer | Flutter & React Native', bio: 'I build apps people love to use.' },
    { name: 'Sara Khan', headline: 'DevOps Engineer | AWS Certified', bio: 'Automating all the things. Kubernetes, Terraform, CI/CD.' },
    { name: 'Vikram Nair', headline: 'Product Designer @ DesignHub', bio: 'Crafting delightful user experiences. Figma power user.' },
    { name: 'Ananya Iyer', headline: 'Frontend Developer | UI Engineer', bio: 'Pixel-perfect interfaces with React and Tailwind.' },
    { name: 'Karan Gupta', headline: 'Engineering Manager | Ex-Startup Founder', bio: 'Helping teams ship great software. Mentor and builder.' },
    { name: 'Meera Reddy', headline: 'Backend Engineer | Go & Node.js', bio: 'Distributed systems and clean APIs.' },
    { name: 'Arjun Singh', headline: 'Cloud Architect | GCP & Azure', bio: 'Designing resilient cloud infrastructure.' },
    { name: 'Nisha Patel', headline: 'QA Lead | Test Automation', bio: 'Quality is not an act, it is a habit.' },
    { name: 'Dev Joshi', headline: 'Full-Stack Developer | MERN', bio: 'From idea to deployment. Open-source contributor.' },
    { name: 'Riya Das', headline: 'UX Researcher | Accessibility Advocate', bio: 'Designing for everyone.' },
    { name: 'Aditya Rao', headline: 'Machine Learning Engineer', bio: 'NLP, computer vision, and everything in between.' },
    { name: 'Tara Bose', headline: 'Technical Writer | Developer Advocate', bio: 'Making complex things simple.' },
    { name: 'Kabir Malhotra', headline: 'Security Engineer | Ethical Hacker', bio: 'Breaking things so others cannot.' },
];

const postTemplates = [
    "Excited to share that I just shipped a major feature at work! 🚀 Months of effort finally paying off. #engineering #shipit",
    "Just finished reading 'Designing Data-Intensive Applications'. Easily one of the best technical books I've read. Highly recommend to any backend engineer. 📚",
    "Hot take: writing good documentation is just as important as writing good code. Your future self (and teammates) will thank you. 💯",
    "Spent the weekend learning Rust. The borrow checker is humbling but I'm starting to see the appeal. Anyone else making the switch? 🦀",
    "Reminder: take breaks. I solved a bug I'd been stuck on for hours within 5 minutes of stepping away from my desk. 🧠",
    "We're hiring! Looking for a senior frontend engineer who loves React and design systems. DM me if interested. #hiring #reactjs",
    "Just got my AWS Solutions Architect certification! 🎉 The journey was tough but so worth it. Happy to share my study resources.",
    "Unpopular opinion: most meetings could have been an async update. Protect your deep work time. ⏳",
    "Open-sourced a small utility library I built for date formatting today. Links in comments. Would love feedback! 🛠️",
    "Attended an amazing tech conference this week. So many inspiring talks on AI and the future of software. My notes are overflowing. ✍️",
    "Mentoring junior developers has made me a better engineer. Teaching forces you to truly understand the fundamentals. 🙌",
    "Refactored a 2000-line file into clean, testable modules today. There's no feeling quite like it. ♻️",
    "The best career advice I ever got: optimize for learning early in your career, not just compensation. 📈",
    "Finally migrated our app to TypeScript. The number of bugs we caught at compile time is staggering. Wish we'd done it sooner.",
    "Built a side project this month that actually has real users now. Bootstrapping is hard but incredibly rewarding. 💪",
    "PSA: please write meaningful commit messages. 'fixed stuff' helps no one. 😅 #cleancode",
    "Just wrapped up a 3-day hackathon. Our team built an AI-powered resume reviewer. Didn't win but learned a ton! 🤖",
    "Loving the developer experience with the new Next.js App Router. Server components are a game changer. ⚡",
    "Career milestone: promoted to Engineering Manager today! Excited (and nervous) for this new chapter. 🎊",
    "Code review tip: be kind. Critique the code, not the person. A good review lifts the whole team up. 🤝",
];

const commentTemplates = [
    'Congratulations! Well deserved. 🎉',
    'This is so insightful, thanks for sharing!',
    'Completely agree with this.',
    'Great post — saving this for later.',
    'Could you share more details?',
    'Inspiring stuff! Keep it up. 💪',
    'I had the exact same experience.',
    'Love this perspective.',
    'Thanks for the recommendation!',
    'So true, learned this the hard way too. 😅',
];

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // cleanup
    console.log('Cleaning previous demo data...');
    const demoUsers = await User.find({ firebaseUid: { $regex: '^demo-' } }).select('firebaseUid');
    const demoUids = demoUsers.map((u) => u.firebaseUid);
    await Post.deleteMany({ authorId: { $in: demoUids } });
    await User.deleteMany({ firebaseUid: { $regex: '^demo-' } });
    console.log(`Removed ${demoUids.length} demo users and their posts.\n`);

    // create users
    console.log('Creating users...');
    const users = [];
    for (let i = 0; i < usersData.length; i++) {
        const u = usersData[i];
        const slug = u.name.toLowerCase().replace(/\s+/g, '.');
        const user = await User.create({
            firebaseUid: `demo-${slug}-${i}`,
            email: `${slug}@demo.minilinkedin.com`,
            name: u.name,
            headline: u.headline,
            bio: u.bio,
            profilePicture: avatar(u.name),
            isProfileComplete: true,
        });
        users.push(user);
    }
    console.log(`Created ${users.length} users.\n`);

    // create posts
    console.log('Creating posts with likes, comments and shares...');
    let postCount = 0, likeTotal = 0, commentTotal = 0, shareTotal = 0;

    // each user makes 1-3 posts
    for (const author of users) {
        const n = 1 + Math.floor(Math.random() * 3);
        const contents = sample(postTemplates, n);
        for (const content of contents) {
            const hasMedia = Math.random() < 0.45;
            const media = hasMedia
                ? [{
                    type: 'image',
                    url: postImg(`${author.name}-${postCount}`),
                    name: 'post-image.jpg',
                    resourceType: 'image',
                }]
                : [];

            // likes from a random subset of other users
            const likers = sample(users.filter((u) => u._id.toString() !== author._id.toString()), Math.floor(Math.random() * 10));
            const likes = likers.map((u) => ({ userId: u.firebaseUid, userName: u.name, timestamp: daysAgo(Math.random() * 10) }));

            // comments
            const commenters = sample(users.filter((u) => u._id.toString() !== author._id.toString()), Math.floor(Math.random() * 4));
            const comments = commenters.map((u) => ({
                content: rnd(commentTemplates),
                authorId: u.firebaseUid,
                authorName: u.name,
                authorAvatar: u.profilePicture,
            }));

            // shares
            const sharers = sample(users.filter((u) => u._id.toString() !== author._id.toString()), Math.floor(Math.random() * 3));
            const shares = sharers.map((u) => ({ userId: u.firebaseUid, userName: u.name, timestamp: daysAgo(Math.random() * 8) }));

            const createdAt = daysAgo(Math.random() * 30);
            await Post.create({
                content,
                authorId: author.firebaseUid,
                authorName: author.name,
                postId: crypto.randomUUID(),
                media,
                likes,
                comments,
                shares,
                likeCount: likes.length,
                commentCount: comments.length,
                shareCount: shares.length,
                createdAt,
                updatedAt: createdAt,
            });

            postCount++;
            likeTotal += likes.length;
            commentTotal += comments.length;
            shareTotal += shares.length;
        }
    }

    console.log(`\nCreated ${postCount} posts | ${likeTotal} likes | ${commentTotal} comments | ${shareTotal} shares.`);
    console.log('\nNote: demo users are seeded directly in MongoDB (no Firebase auth login).');
    console.log('They appear in the feed, profiles and search. To post as yourself, register via the UI.');

    await mongoose.disconnect();
    console.log('\nDone.');
}

run().catch((e) => { console.error('Seed failed:', e); process.exit(1); });
