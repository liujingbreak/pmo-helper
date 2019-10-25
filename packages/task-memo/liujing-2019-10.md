
## Hdecor 4.3.6/1113
https://confluence.bkjk-inc.com/display/ZXJRCP/1113R
https://confluence.bkjk-inc.com/display/ZXJRCP/20191113

1.额度线上化-增加营销额度
     1-0.  首页当额度为0.00,弹出进入营销表单入口 0.25d
     1-1.  增加营销额度表单H5新页面 1d
     1-2.  mock数据0.2d
     1-3.  联调1d

2.增加GPS定位选择当前城市
    1-0. GPS定位结构UI 0.5d
    1-0. GPS定位联调 1d

3.非产权人借款-微众
    1-0. 申请人是否为产权人 选择“否” 备件填写新增字段 0.1d
    1-1.  申请人与产权人关系：（关系人类型枚举：配偶、子女、父母） 0.2d
    1-2. 上传关系证明文件类型：（文件类型枚举：结婚证、户口本、其他）0.2d
    1-3. 联调非产权人借款 1d
4.订单详情页调整优化
    1-0. 申请人信息-增加身份证信息及紧急联系人6个字段 0.3d
    1-1. 额度信息排序修正 0.1d 
    1-2. 装修信息4个字段 0.2d
    1-3. 房产信息9字段排序 0.2d

5.字段校验
    1-0. 房屋交易合同编号匹配DA数据 是否一致 DA无数据 NTS数据为空 0.3d
    1-1.  过户时间匹配DA数据 是否一致 DA无数据 NTS数据为空 0.3d

6.订单管理页面调整字段位置调整优化
    1-0. 订单管理页面字段展示顺序调整 0.2d

7.订单管理优化
    1-0. 列表页，点击每一行的位置都可以进入详情页 0.2d

8.审核页面
    1-0. 审核页面：增加两个功能按钮 保存 + 提交 0.1d
    1-1. 联调API接口  0.5d

9.图片预览操作优化放大缩小
    1-0. https://code.bkjk-inc.com/users/yuan.gao/repos/common-sparepart/browse 库调研0.5d
    1-1. 功能完善 1d
    1-2. 以npm包形式发布 0.2d

10.操作记录优化
    1-0. 操作记录如果是补充备件需要显示上传备件的类型-并以链接形式展示,点击链接可以查看备件图片 0.3d
    1-1. 联调api 0.5d

11.软装入口显示逻辑跳转
    1-0. 自硬装放款日算起三个月（90天）内的订单出现软装入口，超过三个月（91天）不出现软装入口  0.5d

12.备件展示优化    
    1-0. 备件信息展示身份证正反面合并展示，并且放在第一位

13.备件上传新增字段
    1-0. 如果是A类客户，新增交易编号（数字和字母） 0.2d
    1-1. 联调api 0.5d

14.备件信息填写产权人信息更新
    1-0. 申请人是否为产权人？是/否 0.2d
    1-1. 申请人是否唯一产权人？是/否 0.2d
    1-2. 产权人信息（从客户输入端带入）0.2d
    1-3. 联调api 0.5d



## 外贸信托 (8)
3.1.1 四要素认证 (0.5d)
资金方路由规则 (0)
非外贸信托情况下发生的调整点(0.5d)
非外贸信托情况下发生的调整点 (0.5 apply/select-bank inline help)
补充个人信息 (3)
  - 重构地址栏
  - 上传图片OCR
  - 判断资金方
确认银行卡 (0)
添加银行卡
  - API 改动 （0.25）
确认借款 (0)
内部电子签章(2)
影像资料上传(0)
外部风控审核(0)
外部协议签章（0）
含外部审核时的状态机 (1d)
  - 借款记录
  - 申请结果
 还款 (1d)

### Admin
 3.6.1 筛选能力 （1）

## 中台链路 (3 + ?图)
 - 列表 2
 - 详情 1
 - 图 ？2
 
### 双11需求
2个协议


### 代码行数统计

git log  --format='%aN' | sort -u | while read name; do echo -en "$name\t"; git log --author="$name" --pretty=tformat:  --since ==2019-9-1 --until=2019-9-30 --numstat | awk '{ add += $1; subs += $2; loc += $1 - $2 } END { printf "added lines:, %s, removed lines, %s, total lines, %s\n", add, subs, loc }' -; done

git log --format='%aN' | sort -u | while read name; do echo -en "$name\t"; git log --author="$name" --pretty=tformat:  --since ==2019-9-1 --until=2019-9-30 --numstat -- projects/byj | awk '{ add += $1; subs += $2; loc += $1 - $2 } END { printf "added lines:, %s, removed lines, %s, total lines, %s\n", add, subs, loc }' -; done


### 下线3个CFL dalmore应用
#### michelangelostaticlease
Has been migrated to michelangelostaticleasesh
⽉付⻉v1.0后台 ( Alpha 租赁分期系统)
https://code.bkjk-inc.com/projects/ZLZB/repos/credit-fe-admin
旧的repo https://code.bkjk-inc.com/projects/CRED/repos/michelangelo-static-lease

Deploy to https://static.bkjk.com/alpha/lease/

##### Deploy record

| | | | | | |
| - | - | - | - | - | -
| 1543472	| release/V613	| test	| baoy.tao001	| SUCCEEDED |  2019-06-11 10:59:23	发布详情
| 1537999 |	ZLZB-1005 |	prod |	[anonymous]	|SUCCEEDED | 2019-05-21 20:21:05	发布详情
#### michelangelostaticfrontleasesh


#### michelangelostaticportal


### 租装1030 详细设计
hdecor-2773
- alpha 年利率城市增加字段:
- API 增加传 是否"全款购房“字段
- Alpha query list 费率，增加column: 类别
- 
