
https://www.dingxiang-inc.com/docs/detail/const-id#doc-h2-0

## 非北京中后台员工

- 新增协议模板 (0.5d)
- 借款记录页-不同的用户角色和城市可以看到不同的协议列表 (0.5d)
- 签约确认页-不同的用户角色和城市可以看到不同的预览协议详情(0.5d)
- 签约确认页-API联调(0.5d)

- 管理控台-开发搜索表单增加城市筛选输入 (0.5d)
- 管理控台-城市选择的列表来自Hardcode白名单excel或API (0.5d)
- 管理控台-借款人信息列表城市字段显示根据API调整 (0.5d)
- 管理控台-API联调 (0.5d)

## BCL 1.3.0

- 轮询申请状态
  - if status is "new", go "验证合同"
- Credit limit increase page, when submit, show "raising WIP page"
  - new status "Credit limit increase - in progress" from situation API, poll status until status changed

### Task assignment

余力:
  - 额度页面 - 只有独立获客用户可以看到左上角提升额度按钮, 点击route到提升额度 (0.5d)
  - 提升额度 - 展示基本UI layout, service state接口定义(0.5d)
  - 提升额度 - 用户选择非全款购房Action,可以看到2种贷款表单展开(0.25d)
  - 提升额度 - 提交Action,有效验证(0.25d)
  - 提升额度 - 提交成功Action,弹框"恭喜你完成填写", 点击立即申请Action(0.5d)
  - 提升额度 - API mock(0.25d)
  - 提升额度 - API 联调(1d)
刘晶:
  - 统一日期选择控件调研(0.5d)
余力:
  - 修改备件类型列表-当独立获客的用户访问备件上传页，只能添加4种备件类型,白名单用户不变(0.5d)
  - 额度页帮助菜单-开发增加帮助页-显示金融顾问头像(0.25d)
  - 额度页帮助菜单-点击拨打顾问电话action(0.25d)
  - 额度页帮助菜单-API 获取顾问电话 mock 联调 (0.5d)
刘晶:
  - |-
    当额度申请状态为“新申请”,当前用户为“独立获客”用户，可以看到"验证交易信息"页(0.5d)
    service状态开发, 轮询申请状态页面修改
  - Route guarder防止白名单用户进入"验证交易信息"，"额度提升"页(0.5d)
  - 额度申请状态API mock 和联调(0.5d)
丁晓杰:
  - 验证交易信息 - 页面组件基本layout开发(1d)
  - 验证交易信息 - 合同号输入和查询组件开发或复用(0.25d)
  - 验证交易信息 - service 状态开发(0.25d)
  - 验证交易信息 - service 开发可复用的搜索顾问组件(0.25d)
  - 验证交易信息 - 点击验证合同 action, 显示已有合同信息(0.25d)
  - 验证交易信息 - 帮助问好点击action,弹框显示(0.5d)
  - |-
    验证交易信息 - 下一步Action, 有效验证和弹框提示分配金融顾问(0.5d)
    下一步跳转评估轮询页 bcl/evaluate
  - 验证交易信息 - 验证失败显示模板，其他错误提示开发(0.25d)
  - API mock开发 - 查询合同号，查询金融顾问, 提交表单 (1d)
  - API 联调 - 查询合同号，查询金融顾问 (1d)

张翔:
  - 人工审核查询页 - 基本架构，layout, route开发（0.25d）
  - 人工审核查询页 - 查询表单开发（0.25d）
  - 人工审核查询页 - 查询结果tab 和分页列表开发（0.25d）
  - 人工审核查询页 - 查询API mock 开发（0.25d）
  - 人工审核查询页 - 点击列表页事件开发: 根据用户类型(白名单、独立获客)route不同的详情地址（0.25d）
  - 人工审核详情页 - 基本layout(左右分栏可滚动), route开发（0.25d）
  - 人工审核详情页 - layout细节开发:左分栏tab, 右分栏底部fix position效果（0.25d）
  - 人工审核详情页 - 借款人section组件， API mock（0.25d）
  - 人工审核详情页 - 订单信息section组件， API mock（0.25d）
  - 人工审核详情页 - 授信额度section组件， API mock（0.25d）
  - 人工审核详情页 - 备件section组件， API mock（0.25d）
  - 人工审核详情页 - 备件图片预览组件(弹框或窗，旋转，放大功能)（0.25d）
  - 人工审核详情页 - 房屋交易section买方、交易信息组件， API mock（0.25d）
  - 人工审核详情页 - 房屋交易核对信息表单， API mock（0.25d）
  - 人工审核详情页 - 审核section表单UI组件,按钮可点击状态控制（0.25d）
  - 人工审核详情页 - 审核section 校验按钮、额度计算按钮，提交，输入事件处理（0.5d）
  - 人工审核详情页 - 审核section API mock 有效验证，结果和异常toast提示等（0.25d）
  - 人工审核详情页 - 审核section点击弹出审核记录side sheet, API mock（0.25d）
  - 人工审核 - 详情页，查询页，各操作的权限控制逻辑（0.25d）
  - 人工审核查询页 - API 联调(0.5d)
  - 人工审核详情页 - API 联调(1.5d)
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

12.备件展示优化  0.5
    1-0. 备件信息展示身份证正反面合并展示，并且放在第一位 (0.5d)

13.备件上传新增字段 - 0.5
    1-0. 如果是A类客户，新增交易编号（数字和字母） 0.2d
    1-1. 联调api 0.5d

14.备件信息填写产权人信息更新 - 1
    1-0. 申请人是否为产权人？是/否 0.2d
    1-1. 申请人是否唯一产权人？是/否 0.2d
    1-2. 产权人信息（从客户输入端带入）0.2d
    1-3. 联调api 0.5d



## 外贸信托 (12d)
四要素认证 (0.5d)
资金方路由规则 (0)
内部风控节点调整 - 结果页,API变化(1d)
借款审核中 - 人脸识别通过后倒计时(1d)
借款审核中 - 前端展示召回后操作的图片做引导 改动(0.5d)
非外贸信托情况下发生的调整点-apply/select-bank inline help (0.5d)
补充个人信息 (3)
  - 重构地址栏
  - 上传图片OCR
  - 判断资金方
银行卡相关 - 确认银行卡 (0)
银行卡相关 - 添加银行卡 API 改动 （0.25d）
确认借款 (0)
内部电子签章(2d)
影像资料上传(0)
外部风控审核(0)
外部协议签章（0）
含外部审核时的状态机 (1d)
  - 借款记录
  - 申请结果
 还款 (1d)
控台调整 - 资金通道增加外贸信托筛选, 订单状态新增 (1)
控台调整 - 借款信息中增加“信托计划”字段(0.5)


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

