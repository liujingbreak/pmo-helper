
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

## Check and edit tasks

 1. Query tasks for ending in specific days, and whose version does not match parent's version
   ```
   drcp run jira-helper/ts/jira.ts#checkTask
    --end-in-days <num of days>
   ```
 
 2. Query and edit tasks to change version and end-date to match parent
    ```
    drcp run jira-helper/ts/jira.ts#checkTask
    --update-version
    ```
 
 3. Query and edit tasks to postone end-date
    ```
    drcp run jira-helper/ts/jira.ts#checkTask
    --end-in-days <num of days> --add-days <num of days>
    ```
 4. Query and edit tasks to close tasks in status "testing"
   TBD.


## Move sub tasks to another parent issue
```bash
drcp run jira-helper/ts/jira.ts#moveIssues <parent id> <sub task id> <sub task id...>
```
## Assign multiple tasks to someone
```bash
drcp run jira-helper/ts/jira.ts#assignIssues <assignee name> <issue id> <issue id...>
```
