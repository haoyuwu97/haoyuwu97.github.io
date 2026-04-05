Portrait swap notes

This patch already includes a ready-to-use portrait file:
  assets/img/profile-haoyu-manual.jpg

The homepage portrait loader checks these paths in order:
  1) assets/img/profile-haoyu-manual.jpg
  2) assets/img/profile-haoyu-manual.png
  3) assets/img/profile-haoyu.jpg

If you later want to replace the portrait with another square image
(for example the suit headshot), simply overwrite:
  assets/img/profile-haoyu-manual.jpg

No HTML / JS changes are needed.
