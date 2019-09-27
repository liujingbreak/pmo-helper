
### Chrome driver version: 76.0.3809.68
1. First time run:
```bash
drcp run ts/jira.ts#login jira-helper
```
Login from opened Browser.

2. List stories and top level tasks
```bash
drcp run ts/jira.ts#listStory jira-helper [--include BCL[,BYJ...]] [--include-version 1016,1015] [--headless]
```

3. Add sub tasks
   - 1  run `drcp run ts/jira.ts#listStory...` to download latest issue list file in dist/list-story.yaml
   - 2 Edit  dist/list-story.yaml
  Form 1 "property `+`"
   ```yaml
     - name: FE - 前端非功能性需求开发任务
       ver:
         - 贝用金v1.11/1015
       status: 开放
       assignee: 刘晶
       id: BYJ-2485
       est: 5.3
       tasks:
         - name: FE - 开发样式规则工具确保变量正确使用 9/24 (1.5d)
          id: BYJ-2190
          status: 开放
          ver:
            - 贝用金v1.11/1015
          assignee: 刘晶
       +:  # Add '+', this is where new task list begins
         刘晶: # assignee name or id which should be the first match item in JIRA auto complete popup list
           - |- # Multple line indicator
             配合Stark, Node Server启动命令去除环境参数(0.5d) # first line is the "name" field of new task
             问题：Stark在构建时绑定启动命令 # seconde line is "description" field
           - Develop script to simplify jira task creation # Single line of task which only contains "name" field

   ```
  Form 2 "tasks with no ID"
   ```yaml
    - name: FE - 前端非功能性需求开发任务
       ver:
         - 贝用金v1.11/1015
       status: 开放
       assignee: 刘晶
       id: BYJ-2485
       est: 5.3
       tasks:
          - name: "FE - 开发样式规则工具确保变量正确使用 9/24 (1.5d)" # Add "tasks" item with only "name" and "assignee" but no "id" field
            assignee: li1.yu
   ```
     - 3. Run
     ```bash
     drcp run ts/jira.ts#sync jira-helper --file dist/list-story.yaml
     ``` 
     You may repeatly run this command after changing yaml file, it will not create duplicate tasks (distinguish by task "name")

<!-- ### Puppeteer

Environment variables:
- PUPPETEER_SKIP_CHROMIUM_DOWNLOAD - do not download bundled Chromium during installation step. -->
<!-- 
### Selenium doc
[https://seleniumhq.github.io/selenium/docs/api/javascript](https://seleniumhq.github.io/selenium/docs/api/javascript)

### Reference

https://developers.google.com/web/updates/2017/04/headless-chrome

```bash
chrome --headless --disable-gpu --dump-dom https://www.chromestatus.com/
``` -->
