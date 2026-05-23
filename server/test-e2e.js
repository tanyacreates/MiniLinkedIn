// End-to-end API smoke test for Mini-LinkedIn backend (:5001).
// Covers users, profile, posts CRUD, like, comment, share, search, uploads.
const BASE = 'http://localhost:5001/api';

let pass = 0, fail = 0;
const ok = (n, c, d='') => { if (c){console.log(`  ✅ ${n}`);pass++;} else {console.log(`  ❌ ${n} ${d}`);fail++;} };

async function api(method, path, body) {
    const res = await fetch(BASE + path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
    });
    let data=null; try { data = await res.json(); } catch(e){}
    return { status: res.status, data };
}

const PNG_1x1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==','base64');

(async () => {
    const stamp = Date.now();
    const uidA = `e2e-uid-A-${stamp}`;
    const uidB = `e2e-uid-B-${stamp}`;

    console.log('\n=== USERS ===');
    const createA = await api('POST', '/users', { firebaseUid: uidA, email:`a.${stamp}@test.com`, name:'Alice Anderson', headline:'Engineer', bio:'I build things' });
    ok('create user A', createA.status === 201 && createA.data?.firebaseUid === uidA, JSON.stringify(createA.data).slice(0,140));

    const createB = await api('POST', '/users', { firebaseUid: uidB, email:`b.${stamp}@test.com`, name:'Bob Brown', headline:'Designer' });
    ok('create user B', createB.status === 201, JSON.stringify(createB.data).slice(0,140));

    const getA = await api('GET', `/users/${uidA}`);
    ok('get user A by uid', getA.data?.firebaseUid === uidA, JSON.stringify(getA.data).slice(0,140));

    const updateA = await api('PUT', `/users/${uidA}`, { bio:'Updated bio', headline:'Senior Engineer' });
    ok('update user A', updateA.data?.bio === 'Updated bio', JSON.stringify(updateA.data).slice(0,140));

    console.log('\n=== SEARCH ===');
    const searchUsers = await api('GET', `/users/search?q=Alice`);
    ok('user search finds Alice', Array.isArray(searchUsers.data) && searchUsers.data.some(u=>u.name==='Alice Anderson'), JSON.stringify(searchUsers.data).slice(0,140));

    console.log('\n=== POSTS ===');
    const createPost = await api('POST', '/posts', { content:'My first post! #e2e', authorId: uidA, authorName:'Alice Anderson' });
    ok('create post', createPost.status === 201 && !!createPost.data?.postId, JSON.stringify(createPost.data).slice(0,140));
    const postId = createPost.data?.postId;

    const allPosts = await api('GET', '/posts');
    ok('get all posts', Array.isArray(allPosts.data) || Array.isArray(allPosts.data?.posts), JSON.stringify(allPosts.data).slice(0,80));

    const getPost = await api('GET', `/posts/${postId}`);
    ok('get single post', getPost.data?.postId === postId, JSON.stringify(getPost.data).slice(0,100));

    const postsByUser = await api('GET', `/posts?userId=${uidA}`);
    const pbuArr = Array.isArray(postsByUser.data) ? postsByUser.data : postsByUser.data?.posts;
    ok('get posts by user', Array.isArray(pbuArr) && pbuArr.some(p=>p.postId===postId), JSON.stringify(postsByUser.data).slice(0,100));

    console.log('\n=== LIKE / COMMENT / SHARE ===');
    const like = await api('POST', `/posts/${postId}/like`, { userId: uidB, userName:'Bob Brown' });
    ok('like post', like.data?.liked === true && like.data?.likeCount === 1, JSON.stringify(like.data).slice(0,120));
    const unlike = await api('POST', `/posts/${postId}/like`, { userId: uidB, userName:'Bob Brown' });
    ok('unlike post', unlike.data?.liked === false && unlike.data?.likeCount === 0, JSON.stringify(unlike.data).slice(0,120));

    const comment = await api('POST', `/posts/${postId}/comment`, { content:'Nice post!', authorId: uidB, authorName:'Bob Brown' });
    ok('add comment', comment.status === 201 && comment.data?.commentCount === 1, JSON.stringify(comment.data).slice(0,120));
    const commentId = comment.data?.comment?._id;

    const getComments = await api('GET', `/posts/${postId}/comments`);
    ok('get comments', Array.isArray(getComments.data) ? getComments.data.length>=1 : (getComments.data?.comments?.length>=1), JSON.stringify(getComments.data).slice(0,100));

    const delComment = await api('DELETE', `/posts/${postId}/comment/${commentId}`, { userId: uidB });
    ok('delete comment', delComment.status === 200, JSON.stringify(delComment.data).slice(0,100));

    const share = await api('POST', `/posts/${postId}/share`, { userId: uidB, userName:'Bob Brown' });
    ok('share post', share.data?.shared === true && !!share.data?.shareUrl, JSON.stringify(share.data).slice(0,120));

    console.log('\n=== POST SEARCH ===');
    const searchPosts = await api('GET', `/posts/search?q=first`);
    const spArr = Array.isArray(searchPosts.data) ? searchPosts.data : searchPosts.data?.posts;
    ok('post search responds', Array.isArray(spArr), JSON.stringify(searchPosts.data).slice(0,100));

    console.log('\n=== UPLOADS (Cloudinary) ===');
    // post-image
    const fdPost = new FormData();
    fdPost.set('postImage', new Blob([PNG_1x1], { type:'image/png' }), 'p.png');
    const upPost = await fetch(BASE + '/upload/post-image', { method:'POST', body: fdPost });
    const upPostData = await upPost.json().catch(()=>null);
    ok('upload post-image', !!upPostData?.url, JSON.stringify(upPostData).slice(0,140));

    // profile-picture
    const fdProf = new FormData();
    fdProf.set('profilePicture', new Blob([PNG_1x1], { type:'image/png' }), 'a.png');
    const upProf = await fetch(BASE + '/upload/profile-picture', { method:'POST', body: fdProf });
    const upProfData = await upProf.json().catch(()=>null);
    ok('upload profile-picture', !!upProfData?.url, JSON.stringify(upProfData).slice(0,140));

    console.log('\n=== CLEANUP: delete post ===');
    const del = await api('DELETE', `/posts/${postId}`, { userId: uidA });
    ok('delete post', del.status === 200, JSON.stringify(del.data).slice(0,100));

    console.log(`\n========== RESULT: ${pass} passed, ${fail} failed ==========\n`);
    process.exit(fail>0?1:0);
})().catch(e=>{ console.error('CRASH', e); process.exit(2); });
