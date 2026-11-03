# LDP Next Posts

The *What should we write next?* section of the Swell Lab blog, shown to signed-in users. It ranks the CMS blog posts by how often readers choose them from the post list (the `surfBlogPostClicked` custom event, broken down by post), sends the ranking to the `DEVCON_2026_LDP_NEXT_POSTS` AI Hub agent, and shows the three post ideas it returns. Each idea can be saved as a draft in the Swell Lab CMS space.

The script defines the `<ldp-next-posts>` Custom Element and is hosted in Guest Documents & Media as `ldp-next-posts.js`. The agent is described in `../../ai-hub/README.md`.
