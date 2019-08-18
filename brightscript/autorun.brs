Sub Main()
  RunApp()
End Sub


Sub RunApp()

  EnableZoneSupport(true)

  app = {}

  app.msgPort = CreateObject("roMessagePort")

  app.eventLoop = EventLoop
  app.processHtmlWidgetEvent = processHtmlWidgetEvent

  app.htmlRect = CreateObject("roRectangle", 0, 0, 1920, 1080)
  is = {
      port: 2999
  }
  config = {
      nodejs_enabled: true,
      inspector_server: is,
      brightsign_js_objects_enabled: true,
      javascript_enabled: true,
      scrollbar_enabled: true,
      focus_enabled: true,
      mouse_enabled: true,
      url:  "file:///SD:/index.html",
      security_params: {websecurity: false}
  }
  app.htmlContainer = CreateObject("roHtmlWidget", app.htmlRect, config)
  app.htmlContainer.setPort(app.msgPort)
  app.htmlContainer.AllowJavaScriptUrls({ all: "*" })
  app.htmlContainer.SetUserData("server")
  app.htmlContainer.Show()

  app.eventLoop(app.msgPort)

End Sub


Sub EventLoop(msgPort As Object)

  while true
    event = wait(0, msgPort)
    print "event: " + type(event)
    if type(event) = "roHtmlWidgetEvent" then
      m.processHtmlWidgetEvent(event)
    endif
  end while

End Sub


Sub processHtmlWidgetEvent(event As Object) as boolean

  print "=== processHtmlWidgetEvent"
  print type(event)

  retval = false
  
  eventData = event.GetData()
	if type(eventData) = "roAssociativeArray" and type(eventData.reason) = "roString" then
    if eventData.reason = "load-error" then
      print "message = " + eventData.message
    else if eventData.reason = "load-finished" then
      print "load finished"
    endif
  endif

End Sub
