package com.example.book.controller;

import com.example.book.common.Result;
import com.example.book.entity.User;
import com.example.book.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class UserController {

    @Autowired
    private UserService userService;

    @PostMapping("/api/login")
    public Result<User> login(@RequestBody User loginRequest) {
        User user = userService.login(loginRequest.getUsername(), loginRequest.getPassword());
        if (user != null) {
            user.setPassword(null); // Don't return password
            return Result.success(user);
        }
        return Result.error("用户名或密码错误");
    }
}
