const Blog = require("../models/blogModel"); 
const User = require("../models/userModel");
const asyncHandler = require("express-async-handler");
const validateMongoDbId = require("../utils/validateMongodbId");
const { cloudinaryUploadImg } = require("../utils/cloudinary");
const fs = require("fs");


//create blog
const createBlog = asyncHandler(async (req, res) => {
    try {
        const newBlog = await Blog.create(req.body);
        res.json(newBlog);

    }
    catch (error) { 
        throw new Error(error);
    }
});
//update blog
const updateBlog = asyncHandler(async (req, res) => {
    const { id } = req.params;
    validateMongoDbId(id);
    try {
        const updateBlog = await Blog.findByIdAndUpdate(id, req.body, {
            new:true,
        });
        res.json(updateBlog);

    }
    catch (error) { 
        throw new Error(error);
    }
});
    //get blog
const getBlog = asyncHandler(async (req, res) => {
    const { id } = req.params;
    validateMongoDbId(id);
    try {
        const getBlog = await Blog.findById(id).populate("likes")
            .populate("dislikes");
       const updateViews= await Blog.findByIdAndUpdate(
            id,
            {
                $inc: { numViews: 1 },
            }, {
            new: true
        }
        );
        res.json(getBlog);

    }
    catch (error) { 
        throw new Error(error);
    }
});
    
//get all blogs
const getAllBlogs = asyncHandler(async (req, res) => {
    
    try {
        const getBlogs = await Blog.find();
      
        res.json(getBlogs);

    }
    catch (error) { 
        throw new Error(error);
    }
});
    //delete blog
const deleteBlog = asyncHandler(async (req, res) => {
    const { id } = req.params;
    validateMongoDbId(id);
    try {
        const deletedBlog = await Blog.findByIdAndDelete(id, req.body, {
            new:true,
        });
        res.json(deletedBlog);

    }
    catch (error) { 
        throw new Error(error);
    }
});
//like blog
const likeBlog = asyncHandler(async (req, res) => {
    const { blogId } = req.body;
    validateMongoDbId(blogId);
    //findthe blog which you want to be liked
    const blog = await Blog.findById(blogId);
    //find login user
    const loginUserId = req?.user?._id;
//find user if liked post
    const isLiked = blog?.isLiked;
    //find user if disliked post
    const alreadyDisLiked = blog?.disLikes?.find(
        (userId ) => userId?.toString() === loginUserId?.toString());
    
    if (alreadyDisLiked) { 
        const blog = await Blog.findByIdAndUpdate(blogId, {
            $pull: { dislikes: loginUserId },
            isDisliked: false,
        }, { new: true });
        res.json(blog);
    }
    if (isLiked) {
        const blog = await Blog.findByIdAndUpdate(blogId, {
            $pull: { likes: loginUserId },
            isLiked: false,
        }, { new: true });
        res.json(blog);
    }
    else { 
        const blog = await Blog.findByIdAndUpdate(blogId, {
            $push: { likes: loginUserId },
            isLiked: true,
        }, { new: true });
        res.json(blog);
    }

    
    
});
//disliked blog
const dislikeBlog = asyncHandler(async (req, res) => {
    const { blogId } = req.body;
    validateMongoDbId(blogId);
    //findthe blog which you want to be liked
    const blog = await Blog.findById(blogId);
    //find login user
    const loginUserId = req?.user?._id;
//find user if liked post
    const isDisLiked = blog?.isDisliked;
    //find user if disliked post
    const alreadyLiked = blog?.Likes?.find(
        (userId ) => userId?.toString() === loginUserId?.toString());
    
    if (alreadyLiked) { 
        const blog = await Blog.findByIdAndUpdate(blogId, {
            $pull: { likes: loginUserId },
            isLiked: false,
        }, { new: true });
        res.json(blog);
    }
    if (isDisLiked) {
        const blog = await Blog.findByIdAndUpdate(blogId, {
            $pull: { dislikes: loginUserId },
            isDisliked: false,
        }, { new: true });
        res.json(blog);
    }
    else { 
        const blog = await Blog.findByIdAndUpdate(blogId, {
            $push: { dislikes: loginUserId },
            isDisliked: true,
        }, { new: true });
        res.json(blog);
    }
});

const uploadImages = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);
  try {
    const uploader = (path) => cloudinaryUploadImg(path, "images");
    const urls = [];
    const files = req.files;
    for (const file of files) { 
      const { path } = file;
      const newpath = await uploader(path);
        urls.push(newpath);
        fs.unlinkSync(path);
    }
    const findBlog = await Blog.findByIdAndUpdate(id, {
      images: urls.map((file) => {
        return file;
      }),
    },
    
      {
        new:true,
      });
    res.json(findBlog);
  }
  catch (error) { 
    throw new Error(error);
  }
});

module.exports = {createBlog,updateBlog,getBlog,getAllBlogs,deleteBlog,likeBlog,dislikeBlog,uploadImages};