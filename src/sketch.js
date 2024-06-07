let comments = [];

function setup() {
    createCanvas(windowWidth, windowHeight);
    background(255);
    loadComments();
    // 5秒ごとに新しいコメントを取得
    setInterval(loadComments, 5000);
}

function draw() {
    background(255);
    let y = height;
    for (let comment of comments) {
        fill(comment.color);
        textSize(comment.size);
        text(comment.text, 10, y);
        y -= comment.size + 10;
    }
}

function loadComments() {
    fetch('/.netlify/functions/getComments')
        .then(response => response.json())
        .then(data => {
            comments = []; // コメントリストをリセット
            for (let i = 0; i < data.length; i++) {
                let row = data[i];
                let newText = {
                    text: row[0],
                    size: random(10, 64),
                    color: color(random(255), random(255), random(255))
                };
                comments.p
