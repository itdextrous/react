import React, { useRef, useEffect, useState } from 'react'
import Paper from '@material-ui/core/Paper'
import Grid from '@material-ui/core/Grid'
import TextField from '@material-ui/core/TextField'
import List from '@material-ui/core/List'
import ListItem from '@material-ui/core/ListItem'
import ListItemIcon from '@material-ui/core/ListItemIcon'
import ListItemText from '@material-ui/core/ListItemText'
import Avatar from '@material-ui/core/Avatar'
import Fab from '@material-ui/core/Fab'
import SendIcon from '@material-ui/icons/Send'
import AttachmentIcon from '@material-ui/icons/Attachment'
import AssistantIcon from '@material-ui/icons/Assistant'
import HighlightOffIcon from '@material-ui/icons/HighlightOff'
import ImageRoundedIcon from '@material-ui/icons/ImageRounded'
import KeyboardBackspaceIcon from '@material-ui/icons/KeyboardBackspace'
import './App.css'
import DropdownButton from 'react-bootstrap/DropdownButton'
import Button from 'react-bootstrap/Button'
import Dropdown from 'react-bootstrap/Dropdown'
import { getRequest, postRequest, patchRequest } from '../../utils/apiServices'
import { Date } from 'core-js'
import ScrollableFeed from 'react-scrollable-feed'
import { useLocation } from 'react-router-dom'
import { Container } from '@material-ui/core'
import { CCard, CCardBody, CCardHeader } from '@coreui/react'
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs'
import 'react-tabs/style/react-tabs.css'
import useStyles from '../../components/styling/ChatStyling'
import { sendMessageModel } from './SendMessageModel'
import { v4 as uuid } from 'uuid'
import Cookies from 'universal-cookie'
import { useHistory } from 'react-router-dom'
import DOMPurify from 'dompurify'

let chatConversation = []
let countUnreadMessages = 0

const initialState = {
  careTeamList: [],
  spinnerLoding: false,
  careTeamPatientId: '',
  chatingConversation: null,
  sendTextValue: '',
  useCustomBubble: false,
}

const Chat = () => {
  const classes = useStyles()
  const search = useLocation().search
  const patientId_onURL = new URLSearchParams(search).get('patient')

  const location = useLocation()
  const param = location.state

  let history = useHistory()

  // BaseUrl for methods
  const baseUrl = process.env.REACT_APP_BASE_URL
  const baseFhirUrl = process.env.REACT_APP_BASE_URL_FHIR
  const baseUrlCMS = process.env.REACT_APP_BASE_URL_CMS
  // const baseUrlApiDev = process.env.REACT_APP_API_DEV_URL
  const baseUrlPortal = process.env.REACT_APP_PORTAL_URL
  const baseUrlFhir = process.env.REACT_APP_FHIR_URL
  const baseUrlBackendDev = process.env.REACT_APP_BACKEND_DEV_URL

  // React Hooks
  const refMessageSpan = useRef()
  const [formValue, setFormValue] = useState('')
  const [state, setState] = useState(initialState)
  const [newGroupDDNData, setNewGroupDDNData] = useState([])
  const [selectedCareTeam, setselectedCareTeam] = useState(false)
  const [selectedCareTeamId, setselectedCareTeamId] = useState(null)
  const [groupId, setGroupListId] = useState('')
  const [selectedGroupName, setSelectedGroupName] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [formData, setFormData] = useState({ file: '', patientId: '' })
  const [openDialog, setOpenDialog] = useState(false)
  const [dialogData, setDialogData] = useState([])
  const PatientID = React.useRef(null)
  const [update, setUpdate] = useState(false)

  const cookies = new Cookies()
  const unique_id = uuid()
  const small_id = unique_id.slice(0, 8)

  useEffect(() => {
    PatientID.current = patientId_onURL
    chatConversation = []
    sideBarList()
    getNewGroupList()
    setselectedCareTeam(false)
  }, [])

  /**
   * @method GET
   * Side bar - different care teams convertion with patient
   */
  const sideBarList = async () => {
    setState({ ...state, spinnerLoding: true })
    let url
    if (patientId_onURL) {
      url = `${baseFhirUrl}/CareTeam?patient=${patientId_onURL}&_sort=-_lastUpdated&_count=1000`
    } else {
      url = `${baseFhirUrl}/CareTeam?_sort=-_lastUpdated&_count=1000`
    }

    // API Call
    try {
      const response = await getRequest(url)
      setState({
        ...state,
        careTeamList: response.data.entry,
        careTeamPatientId: response.data.id,
        spinnerLoding: false,
      })
    } catch (error) {
      setState({ ...state, spinnerLoding: false })
      console.log(error)
    }
  }

  useEffect(() => {
    if (param) {


      if (state.careTeamList.length > 0 && param && update === false) {
        console.log('HI', state.careTeamList)
        setSelectedGroupName(param.groupName)
        getSelectedTeamMessages(param.groupId, param.patientId, param.unreadCount)
      }
    }
  }, [state.careTeamList])

  /**
   * @method GET - Group List of care teams
   */
  const getNewGroupList = async () => {
    let url = `${baseUrlCMS}/items/care_team?fields=*`
    // API Call
    try {
      const response = await getRequest(url)
      setNewGroupDDNData(response.data.data)
    } catch (error) {
      console.log(error)
    }
  }

  useEffect(() => {
    setTimeout(() => {
      if (state.careTeamList.length > 0) {
        state.careTeamList.forEach((element) => {
          const groupId = element.resource.id
          addMissingExtensions(groupId)
        })
      }
    }, 2000)
  }, [])

  /**
   * Method to Add missing extension to threads
   * @param {string} groupId - resource id's for which extension would be modify
   */
  const addMissingExtensions = (groupId) => {
    const modifiedExtensions = getModifiedExtensions(groupId)
    if (modifiedExtensions[0].length < 5) {
      const addExtensionsObj = [
        { op: 'add', path: '/extension', value: [] },
        {
          op: 'add',
          path: '/extension/0',
          value: {
            url: 'last-message',
            valueString: '',
          },
        },
        {
          op: 'add',
          path: '/extension/1',
          value: {
            url: 'last-message-author',
            valueString: '',
          },
        },
        {
          op: 'add',
          path: '/extension/2',
          value: {
            url: 'last-message-datetime',
            valueString: '',
          },
        },
        {
          op: 'add',
          path: '/extension/3',
          value: {
            url: 'image',
            valueString: '',
          },
        },
        {
          op: 'add',
          path: '/extension/4',
          value: {
            url: 'unread-message-count',
            valueInteger: 0,
          },
        },
        {
          op: 'add',
          path: '/extension/5',
          value: {
            url: 'medlix-careteam-id',
            valueInteger: 3,
          },
        },
      ]
    }
  }

  /**
   * Getting all careteam extension to check it has all the required extension or not
   * @param {string} groupId - getting resource id's for which extension would be modify
   */
  const getModifiedExtensions = (groupId) => {
    let modifiedExtension = state.careTeamList
      .map(function (careTeam) {
        if (careTeam.resource.id === groupId) {
          return careTeam.resource.extension
        }
      })
      .filter((x) => x !== undefined)
    return modifiedExtension
  }

  /**
   * This function is used to check the validation of the file
   * @param {*} file - selected attachment
   * @returns - It will return boolean value
   */
  const isValidFileUploaded = (file) => {
    //to remove double extension files and null bytes
    if (file.name.split('.').length > 2) return false

    const validExtensions = ['png', 'jpeg', 'jpg']
    const fileExtension = file.type.split('/')[1]
    return validExtensions.includes(fileExtension)
  }

  /**
   * @method POST - This method will call to get url of image that selected and sent by user
   */
  const setPayload = async () => {
    var payload
    setOpenDialog(false)
    countUnreadMessages = countUnreadMessages + 1
    if (imageUrl !== '') {
      var formDataa = new FormData()
      formDataa.append('file', formData.file)
      formDataa.append('patientId', formData.patientId)
      let url = `${baseUrlBackendDev}/UploadFile?code=aXcSiwGKBNLo9b3A9hgHiGgeR/e1GighaezKh4qi2JhEupGsBxV2ng==`
      // API Call
      try {
        const response = await postRequest(url, formDataa)
        payload = response.data
        sendMessage(payload)
      } catch (error) {
        console.log(error)
      }
    } else {
      payload = formValue
      sendMessage(payload)
    }
  }

  /**
   * @method POST - This method will call when user will send any message
   * @param {string} payload - form value from chat page either attachment or text message
   */
  const sendMessage = async (payload) => {
    const data = sendMessageModel(
      baseUrlFhir,
      groupId,
      PatientID.current,
      payload,
      countUnreadMessages,
    )

    let url = `${baseUrlBackendDev}/SendMessage?code=vEfF3sGrg3UMfM6JSP3e3mqa/PKQxO7pFUR9l9rAGmMzJkG9JOiLsw==`

    // API Call
    try {
      const response = await postRequest(url, data)
      setFormValue('')
      updateConversation(groupId) //Calling method to update chat conversation after message sent successfully
      sideBarList() // Calling Method to update side bar data
    } catch (error) {
      console.log(error)
    }
    setFormValue('')
    setImageUrl('')
    refMessageSpan.current.scrollIntoView({ behavior: 'smooth' })
  }

  /**
   * @method GET - method to update conversation and get new sent message
   * @param {string} groupId - resource id of selected conversation
   */
  const updateConversation = async (groupId) => {
    let url = `${baseFhirUrl}/Communication?_sort=-_lastUpdated&communication-careteam=CareTeam/${groupId}&patient=Patient/${PatientID.current}`
    // API Call
    try {
      const response = await getRequest(url)
      if (response.status === 200 && response.data.entry !== undefined) {
        chatConversation = response.data.entry.reverse()
        setState({ ...state, chatingConversation: chatConversation })
      } else {
        setState({ ...state, chatingConversation: null })
      }
    } catch (error) {
      console.log(error)
      setTimeout(() => {
        setState({ ...state, spinnerLoding: false })
      }, 1000)
    }
  }

  /**
   * Method to update sidebar data based on updated extensions
   * @param {string} groupId - resource id of selected conversation
   * @param {string} type - url name of extension like "url: "last-message""
   * @param {object} extension - url and valueString of extension
   */
  const updateSideBarData = (groupId, type, extension) => {
    let patchModel = []
    const modifiedExtensions = getModifiedExtensions(groupId)
    const index = modifiedExtensions[0].findIndex((x) => x.url === type)
    if (index !== -1) {
      patchModel = [
        {
          op: 'replace',
          path: `extension/${index}`,
          value: extension,
        },
      ]
      careTeamPatchRquest(groupId, patchModel, true) // Calling patch method after selecting any thread which has unread-message-count > 0
    } else {
      console.log('something went wrong!')
    }
  }

  /**
   * @method PATCH - method to update extensions
   * @param {string} groupId - resource id of selected conversation
   * @param {Array} patchModel - extension detail to update
   * @param {boolean} refresh - bool variable to update sidebar list when TRUE
   */
  const careTeamPatchRquest = async (groupId, patchModel, refresh = false) => {
    let url = `${baseFhirUrl}/CareTeam/${groupId}`
    // API Call
    try {
      const response = await patchRequest(url, patchModel)
      setUpdate(true)
      if (response.status === 200 && refresh) {
        sideBarList()
      } else {
        console.log('please check response status')
      }
    } catch (error) {
      console.log(error)
    }
  }

  /**
   * Chat Message of selecting threads
   * @param {string} props - input message to sent
   */
  function ChatMessage(props) {
    const MessagesThread = props.message
    const messageClass = 'sent'
    const image = MessagesThread.includes('.blob')
    return (
      <>
        <div className={`message ${messageClass}`}>
          {image === true ? (
            <img alt='chat_Image' src={MessagesThread} className={classes.message_img} />
          ) : (
            <p dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(MessagesThread) }}></p>
          )}
        </div>
      </>
    )
  }

  /**
   * Selected any Attachment from chat page to send.
   * @param {object} files - Attached input file
   */
  const addAttachment = (e) => {
    //to check if the user is authorise
    if (!cookies.get('refreshToken')) {
      alert('UnAuthorize to upload the file')
      return false
    }
    if (e.target.files[0].name.length > 100) {
      //file is invalid
      alert('Name of the file is too long exceeds 100 characters')
      return
    }
    if (!isValidFileUploaded(e.target.files[0])) {
      //file is invalid
      alert('File is invalid')
      return
    }
    const newFileName = new File(
      [e.target.files[0]],
      small_id + '.' + e.target.files[0].type.split('/')[1],
      {
        type: e.target.files[0].type.split('/')[1],
        lastModified: Date.now(),
      },
    )
    console.log(newFileName)
    setOpenDialog(false)
    const maxFileSize = 100000000
    var file = ''
    file = newFileName

    if (file.size <= maxFileSize) {
      var url = URL.createObjectURL(file)
      setImageUrl(url)
      setFormData({
        file: file,
        patientId: PatientID.current,
      })
    } else {
      alert('The file is too large. Allowed maximum size is 100 MB')
    }
  }

  /**
   * Selecting any conversion from sidebar list
   * @param {string} groupId - resource id of selected conversation
   * @param {string} patient_id - getting Dynamic patientId everytime when selecting any conversation
   * @param {number} unreadMessageCount - unread message count of selected conversation
   */
  const getSelectedTeamMessages = (groupId, patient_id, unreadMessageCount) => {
    var id = patient_id.split('/')
    PatientID.current = id[1]
    setUpdate(false)
    setImageUrl('')
    setOpenDialog(false)
    countUnreadMessages = 0
    setGroupListId(groupId)
    setState({ ...state, spinnerLoding: true })
    setselectedCareTeam(true)
    setselectedCareTeamId(groupId)
    chatConversation = []
    updateConversation(groupId)
    if (unreadMessageCount !== 0) {
      setTimeout(() => {
        //calling method to update conversation "unread-message-count" to 0
        updateSideBarData(groupId, 'unread-message-count', {
          url: 'unread-message-count',
          valueInteger: 0,
        })
      }, 1000)
    }
  }

  /**
   * @method POST - When selecting New Care team from "New Group Threads", it will add new thread to side bar
   * @param {object} item - attributes(name, description...) and id of selected careteam from "New Group Threads"
   */
  const newGroupFunction = async (item) => {
    let data = {
      resourceType: 'CareTeam',
      id: item.id,
      meta: {
        versionId: 1,
        lastUpdated: new Date(),
      },
      extension: [
        {
          url: 'last-message',
          valueString: '',
        },
        {
          url: 'last-message-author',
          valueString: '',
        },
        {
          url: 'last-message-datetime',
          valueDateTime: '',
        },
        {
          url: 'image',
          valueString: item.image ? `${baseUrl}/assets/${item.image}` : '',
        },
        {
          url: 'unread-message-count',
          valueInteger: 0,
        },
        {
          url: 'medlix-careteam-id',
          valueInteger: 3,
        },
      ],
      status: 'active',
      name: item.name,

      subject: {
        reference: `Patient/${PatientID.current}`,
      },
    }
    let url = `${baseFhirUrl}/CareTeam`
    // API Call
    try {
      const response = await postRequest(url, data)
      if (response.status === 201) {
        sideBarList()
        setselectedCareTeam(true)
      } else {
        console.log('please check response status')
      }
    } catch (error) {
      console.log(error)
    }
  }

  /**
   * To filter the careteams search by user with input
   * @param {event} e - onchange target value
   */
  const searchFunction = (e) => {
    if (e.target.value) {
      const lowerCased = e.target.value.toLowerCase()
      let filterValue = state.careTeamList.filter((item, index) =>
        item.resource.name.toLowerCase().includes(lowerCased),
      )
      setState({ ...state, careTeamList: filterValue })
    } else {
      sideBarList()
    }
  }

  /**
   * @method GET - calling when clicking on canned message Icon and search for any canned
   * @param {Event} searchText - onchange target value
   *
   */
  const openCannedDialog = async (searchText) => {
    setOpenDialog(true)
    let url
    if (!searchText) {
      url = `${baseUrlPortal}/items/canned_responses?search=canned`
    } else {
      url = `${baseUrlPortal}/items/canned_responses?search=${searchText}`
    }

    // API Call
    try {
      const response = await getRequest(url)
      let data = response.data.data
      setDialogData(data)
    } catch (error) {
      console.log(error)
    }
  }

  /**
   * This method calling when clicking on any canned message from canned conversation
   * @param {string} data - selected canned message
   */
  const onSelectCanned = (data) => {
    var html = data
    var div = document.createElement('div')
    div.innerHTML = html
    var text = div.textContent || div.innerText || ''
    setFormValue(text)
    setOpenDialog(false)
  }

  return (
    <Container>
      <CCard className="border-0">
        <CCardHeader className="p-0 bg-transparent border-0 d-flex justify-content-between chatboxhead mb-4 align-items-center">
          {/* Chat Header */}
          <h2 className="patient_heading">Chat</h2>
          <div className='d-flex align-items-center'>

            {/* Button to navigate Admin chat list */}
            {param ? (
              <Button className='me-3' onClick={() => history.push('/adminChat')}>
                <KeyboardBackspaceIcon />
                Back to the List
              </Button>
            ) : null}

            {/* Dropdown to select Care team for new thread */}
            <DropdownButton title="New Group Threads">
              {newGroupDDNData !== null ? (
                newGroupDDNData.map((item, index) => (
                  <Dropdown.Item onClick={() => newGroupFunction(item, index)} key={index}>
                    {item.name}
                  </Dropdown.Item>
                ))
              ) : (
                <Dropdown.Item>No record found!</Dropdown.Item>
              )}
            </DropdownButton>
          </div>
        </CCardHeader>

        <CCardBody className="wht_bx wht_bx1 p-0 chat_sec overflow-hidden">
          <Grid container item component={Paper} className={classes.chatSection}>

            {/* SideBar */}
            <Grid item={true} xs={3} className={classes.borderRight500}>
              <Grid item={true} className="chat-search mb-3">
                <TextField
                  id="outlined-basic-email"
                  label="Search"
                  className="search_box"
                  variant="outlined"
                  fullWidth
                  onChange={(e) => searchFunction(e)}
                />
              </Grid>
              <List>
                {state.careTeamList
                  ? state.careTeamList.map((item, index) => {
                    if (item.resource.extension !== undefined) {
                      let imageUrl = item.resource.extension.find(
                        (rec, index) => rec?.url === 'image',
                      )?.valueString
                      let lastMessageText = item.resource.extension.find(
                        (rec, index) => rec?.url === 'last-message',
                      )?.valueString
                      let unreadMessageCount = item.resource.extension.find(
                        (rec, index) => rec?.url === 'unread-message-count',
                      )?.valueInteger
                      let lastMessageDatetime = item.resource.extension.find(
                        (rec, index) => rec?.url === 'last-message-datetime',
                      )?.valueDateTime
                      return (
                        <ListItem
                          className={`${item.resource.id === selectedCareTeamId ? 'active_item' : ''
                            } ${classes.sideBarListItem}`}
                          button
                          key={'#RemySharp' + item.resource.id}
                          onClick={() => {
                            getSelectedTeamMessages(
                              item.resource.id,
                              item.resource.subject.reference,
                              unreadMessageCount,
                            )
                            setSelectedGroupName(item.resource.name)
                          }}
                        >
                          <ListItemIcon>
                            <Avatar alt="Remy Sharp" src={imageUrl} />
                          </ListItemIcon>

                          <ListItemText>
                            {item.resource.name}
                            <ListItemText className={classes.listItemSidebar}>
                              {lastMessageText !== undefined &&
                                lastMessageText.includes('.blob') ? (
                                <span>
                                  Image <ImageRoundedIcon />
                                </span>
                              ) : (
                                <span className={classes.user_msg_txt} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(lastMessageText) }}></span>
                              )}
                            </ListItemText>
                          </ListItemText>
                          {/* {unreadMessageCount > 0 ? (
                      <div className={classes.unreadCountCircle}>
                        <span className={classes.unreadCountFont}>
                          {unreadMessageCount}
                        </span>
                      </div>
                    ) : null} */}
                        </ListItem>
                      )
                    }
                  })
                  : null}
              </List>
            </Grid>

            {/* Chat Conversation */}
            <div className={classes.chatConversationDiv}>
              <ScrollableFeed className="pe-3">
                <div>
                  <h4 className="select-chatuser">{selectedGroupName}</h4>
                </div>
                <>
                  {chatConversation.length !== 0 ? (
                    chatConversation.map((item, index) => {
                      return item.resource.payload === undefined ? null : (
                        <ChatMessage
                          key={index}
                          message={item.resource?.payload[0].contentString}
                        />
                      )
                    })
                  ) : selectedCareTeam === false ? (
                    <h1 className="select-thread">Please select a thread!</h1>
                  ) : (
                    <h3 className="select-thread">Start chating</h3>
                  )}
                  <span ref={refMessageSpan}></span>
                </>
              </ScrollableFeed>

              {/* Image Preview */}
              {imageUrl !== '' ? (
                <Grid className={classes.gridAlignment}>
                  <CCard>
                    <HighlightOffIcon
                      onClick={() => setImageUrl('')}
                      className={classes.removeIconsAttachment}
                    />
                    <CCardBody>
                      <img alt='Image_preview' src={imageUrl} className={classes.imagePreview} />
                    </CCardBody>
                  </CCard>
                </Grid>
              ) : null}

              {/* Canned Response Dialog */}
              {openDialog === true ? (
                <CCard className={classes.cannedDialog}>
                  <CCardHeader className={classes.cardHeader}>
                    Canned Responses{' '}
                    <HighlightOffIcon
                      onClick={() => setOpenDialog(false)}
                      className={classes.removeIconsAttachment}
                    />
                  </CCardHeader>
                  <CCardBody className={classes.cannedDialogBody}>
                    <Tabs>
                      <TabList>
                        <Tab onClick={() => openCannedDialog(null)}>All</Tab>
                        <Tab>Welcome Meassage</Tab>
                        <Tab>Payment</Tab>
                      </TabList>

                      <TabPanel>
                        <TextField
                          id="outlined-basic-email"
                          label="Search"
                          className="search_box"
                          variant="outlined"
                          fullWidth
                          onChange={(e) => openCannedDialog(e.target.value)}
                        />
                        {dialogData ? (
                          dialogData.map((item, index) => {
                            return (
                              <div
                                key={index}
                                onClick={() => onSelectCanned(item.body)}
                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(item.body) }}
                              />
                            )
                          })
                        ) : (
                          <h6 className={classes.NoCannedData}>No items match your search.</h6>
                        )}
                      </TabPanel>
                      <TabPanel>
                        <p>No Data</p>
                      </TabPanel>
                      <TabPanel>
                        <p>No Data</p>
                      </TabPanel>
                    </Tabs>
                  </CCardBody>
                </CCard>
              ) : null}

              {/* Chat Form */}
              {selectedCareTeam ? (
                <Grid item={true}>
                  <Grid
                    container
                    item
                    className={`${classes.inputMessageGrid} messagbox d-flex flex-nowrap`}
                  >
                    <Grid item={true} className="w-100 me-2">
                      <TextField
                        value={formValue}
                        label="Say something nice"
                        fullWidth
                        onChange={(e) => setFormValue(e.target.value)}
                        onKeyUp={(e) => {
                          if (e.key === 'Enter') {
                            setPayload()
                          }
                        }}
                      />
                    </Grid>

                    {/* Canned message Icon */}
                    <Grid item align="right" className="me-2">
                      <Fab color="primary">
                        <AssistantIcon onClick={() => openCannedDialog(null)} />
                      </Fab>
                    </Grid>

                    {/* Attachment Icon for add attachments */}
                    <Grid item align="right" className="me-2">
                      <Fab color="primary">
                        <input
                          accept="image/*"
                          className={classes.addAttachments}
                          id="raised-button-file"
                          multiple
                          type="file"
                          onChange={(e) => addAttachment(e)}
                          onClick={(e) => {
                            setOpenDialog(false)
                            e.target.value = null
                          }}
                        />
                        <label htmlFor="raised-button-file">
                          <AttachmentIcon />
                        </label>
                      </Fab>
                    </Grid>

                    {/* Send Icon for Send messages */}
                    <Grid item align="right">
                      <Fab color="primary" aria-label="add" disabled={!formValue && !imageUrl}>
                        <SendIcon onClick={setPayload} />
                      </Fab>
                    </Grid>
                  </Grid>
                </Grid>
              ) : null}
            </div>
          </Grid>
        </CCardBody>
      </CCard>
    </Container>
  )
}

export default Chat
