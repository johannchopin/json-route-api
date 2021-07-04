/* eslint-disable no-shadow */
import * as path from 'path'
import * as fs from 'fs'
import 'isomorphic-fetch'
import Restapify from '../Restapify'

// D A T A
import getAnimals from '../../test/api/animals.json'
import getAnimalsByName from '../../test/api/animals/[name].json'
import getAnimalHedgehog from '../../test/api/animals/hedgehog.json'
import getAnimalsByNameFriends from '../../test/api/animals/[name]/friends/[friend_id].json'
import getPlants from '../../test/api/plants.GET.json'
import getUserErr from '../../test/api/users/[userid].404.{ERR}.json'
import postUsers from '../../test/api/users/_.POST.201.json'
import getComments from '../../test/api/comments/_.GET.json'
import getCommentsById from '../../test/api/comments/[id]/_.json'
import deleteUser from '../../test/api/users/[userid].DELETE.json'
import deleteUserErr from '../../test/api/users/[userid].DELETE.404.{ERR}.json'
import deleteUserInvCred from '../../test/api/users/[userid].DELETE.401.{INV_CRED}.json'

const restapifyParams = {
  rootDir: path.resolve(__dirname, '../../test/api'),
  port: 6767,
  baseUrl: '/api',
  hotWatch: false
}

const baseUrl = `http://localhost:${restapifyParams.port}`
const apiRoot = `${baseUrl}${restapifyParams.baseUrl}`

describe('Restapify', () => {
  let rpfy

  beforeEach(() => {
    rpfy = new Restapify(restapifyParams)
    rpfy.run()
  })

  afterEach(() => {
    rpfy.close()
  })

  describe('HTTP verbs', () => {
    describe('GET', () => {
      it('should respond to get', async () => {
        let response = await fetch(`${apiRoot}/plants`)
        let data = await response.json()
        expect(data).toStrictEqual(getPlants)
      })

      it('should respond to default get', async () => {
        let response = await fetch(`${apiRoot}/animals`)
        let data = await response.json()
        expect(data).toStrictEqual(getAnimals)
      })

      it('should respond with underscore notation for default get', async () => {
        let response = await fetch(`${apiRoot}/comments/25`)
        let data = await response.json()
        expect(data).toStrictEqual(getCommentsById)
      })

      it('should respond with underscore notation and get http verb', async () => {
        let response = await fetch(`${apiRoot}/comments`)
        let data = await response.json()
        expect(data).toStrictEqual(getComments)
      })
    })

    describe('PATCH', () => {
      it('should respond to patch', async () => {
        let response = await fetch(`${apiRoot}/users/123`, {
          method: 'PATCH'
        })
        expect(response.status).toBe(204)
      })
    })
  })

  describe('Server base url', () => {
    it('should by default serve on /api', async () => {
      let response = await fetch(`http://localhost:6767/api/plants`)
      let data = await response.json()
      expect(data).toStrictEqual(getPlants)
    })

    it('should serve on custom base url', async () => {
      const rpfy = new Restapify({...restapifyParams, port: 4242, baseUrl: '/dev'})
      rpfy.run()

      let response = await fetch(`http://localhost:4242/dev/plants`)
      let data = await response.json()
      rpfy.close()
      expect(data).toStrictEqual(getPlants)
    })

    it('should serve on correct base url', async () => {
      const rpfy = new Restapify({...restapifyParams, port: 4242, baseUrl: 'dev/'})
      rpfy.run()

      let response = await fetch(`http://localhost:4242/dev/plants`)
      let data = await response.json()
      rpfy.close()
      expect(data).toStrictEqual(getPlants)
    })
  })

  describe('Response Header', () => {
    it('should serve by default application/json content type', async () => {
      let response = await fetch(`${apiRoot}/posts/`)
  
      let headers = response.headers

      expect(headers.get('Content-type')).toBe('application/json; charset=utf-8')
    })
  })

  describe('Underscore notation', () => {
    it('should respond to a GET with underscore notation and get http verb', async () => {
      let response = await fetch(`${apiRoot}/comments`)
      let data = await response.json()
      expect(data).toStrictEqual(getComments)
    })
  })

  describe('Route variables', () => {
    it('should respond with injected variable', async () => {
      const variable = 'toby'
      const expectedResponse = { ...getAnimalsByName, name: variable }
      let response = await fetch(`${apiRoot}/animals/${variable}`)
      let data = await response.json()
      expect(data).toStrictEqual(expectedResponse)
    })

    it('should respond with injected variable in nested route', async () => {
      const animalName = 'toby'
      const friendId = '123'
      const expectedResponse = {
        ...getAnimalsByNameFriends,
        id: friendId,
        friends: [
          {
            ...getAnimalsByNameFriends.friends[0],
            name: animalName
          }
        ]
      }
      let response = await fetch(`${apiRoot}/animals/${animalName}/friends/${friendId}`)
      let data = await response.json()
      expect(data).toStrictEqual(expectedResponse)
    })
  })

  describe('Route escaped variables', () => {
    it('should respond with escaped variable', async () => {
      let response = await fetch(`${apiRoot}/users/123/friends`)
      const expectedResponse = {
        user: "123",
        friends: [{bio: "I love to use the [userid] variable"}]
      }

      const data = await response.json()
      expect(data).toStrictEqual(expectedResponse)
    })
  })

  describe('Route body', () => {
    it('should respond with empty body', async () => {
      let response = await fetch(`${apiRoot}/users/123`, {
        method: 'PUT'
      })
      const body = await response.text()
      expect(body).toBe('')
    })
  })

  describe('Extended structure', () => {
    it('should respond with #body', async () => {
      let response = await fetch(`${apiRoot}/users/`, {
        method: 'POST'
      })
      let data = await response.json()
      expect(data).toStrictEqual(postUsers['#body'])
    })

    it('should respond without a body', async () => {
      let response = await fetch(`${apiRoot}/comments/43`)
      let data = await response.text()
      expect(data.length).toBe(0)
    })

    it('should respond with custom #header', async () => {
      let response = await fetch(`${apiRoot}/users/`, {
        method: 'POST'
      })
  
      let headers = response.headers

      Object.keys(postUsers['#header']).forEach(headerProperty => {
        expect(headers.get(headerProperty)).toBe(postUsers['#header'][headerProperty])
      })
    })
  })

  it('should respond with defined HTTP Status Code', async () => {
    const expectedStatusCode = 201
    let response = await fetch(`${apiRoot}/users/`, {
      method: 'POST'
    })

    let statusCode = response.status

    expect(statusCode).toBe(expectedStatusCode)
  })

  it('should fetch a specific route', async () => {
    let response = await fetch(`${apiRoot}/animals/hedgehog`)
    let data = await response.json()
    expect(data).toStrictEqual(getAnimalHedgehog)
  })

  it('should not generate same faker value in for loop', async () => {
    let response = await fetch(`${apiRoot}/cars`)
    let data = await response.json()

    const areGeneratedDataSimilaire = data[0].type === data[1].type && data[1].type === data[2].type && data[2].type === data[10].type
    expect(areGeneratedDataSimilaire).toBeFalsy()
  })
})

describe('Restapify with state variables', () => {
  let rpfy
  const states = [
    {
      route: '/users/[userid]',
      method: 'DELETE',
      state: 'ERR'
    },
    {
      route: '/users/[userid]',
      state: 'ERR'
    }
  ]

  beforeEach(() => {
    rpfy = new Restapify({
      ...restapifyParams,
      states
    })

    rpfy.run()
  })

  afterEach(() => {
    rpfy.close()
  })

  it('should respond according to state variable', async () => {
    let response = await fetch(`${apiRoot}/users/123`, {
      method: 'DELETE'
    })

    let statusCode = response.status
    let data = await response.json()

    expect(data).toStrictEqual(deleteUserErr['#body'])
    expect(statusCode).toBe(404)
  })

  it('should respond according to state variable with default method', async () => {
    let response = await fetch(`${apiRoot}/users/123`)

    let statusCode = response.status
    let data = await response.json()

    expect(data).toStrictEqual(getUserErr)
    expect(statusCode).toBe(404)
  })

  it('should update state variable and respond with new data', async () => {
    rpfy.setState({
      route: '/users/[userid]',
      method: 'DELETE'
    })

    let response = await fetch(`${apiRoot}/users/123`, {
      method: 'DELETE'
    })

    let statusCode = response.status
    let data = await response.json()

    expect(data).toStrictEqual(deleteUser['#body'])
    expect(statusCode).toBe(200)
  })

  describe('define routes states', () => {
    it('should not set states in route that don\'t have any', () => {
      const getUsersRoute = rpfy.routes.GET['/users']
      expect(getUsersRoute.states).toBe(undefined)
    })

    it('should set correct state to route', () => {
      const deleteUserRoute = rpfy.routes.DELETE['/users/[userid]'].states

      const expectedState = {
        'INV_CRED': {
          fileContent: JSON.stringify(deleteUserInvCred),
          statusCode: 401,
          isExtended: false,
          getBody: expect.any(Function)
        },
        'ERR': {
          fileContent: JSON.stringify(deleteUserErr, null, '  '),
          statusCode: 404,
          header: deleteUserErr['#header'],
          body: deleteUserErr['#body'],
          isExtended: true,
          getBody: expect.any(Function)
        }
      }

      expect(deleteUserRoute).toStrictEqual(expectedState)
    })
  })

  describe('setState', () => {
    it('should update state variable', async () => {
      const updatedState = {
        route: '/users/[userid]',
        state: 'TEST',
        method: 'DELETE'
      }
      const expectedStates = [updatedState, {
        route: '/users/[userid]',
        state: 'ERR'
      }]
      rpfy.setState(updatedState)

      expect(rpfy.states).toStrictEqual(expectedStates)
    })

    it('should add state variable', async () => {
      const newState = {
        route: '/users/[userid]/comments',
        state: 'ERR',
        method: 'POST'
      }
      const expectedStates = [...states, newState]
      rpfy.setState(newState)

      expect(rpfy.states).toStrictEqual(expectedStates)
    })

    it('should remove state variable', async () => {
      const updatedState = {
        route: '/users/[userid]',
        method: 'DELETE'
      }
      const expectedStates = []
      rpfy.setState(updatedState)

      expect(rpfy.states).toStrictEqual(expectedStates)
    })
  })

  it('should open dashboard', async () => {
    const expectedPageTitle = '<title>Dashboard • Restapify</title>'
    let response = await fetch(`${baseUrl}/restapify`)
    const text = await response.text()
    expect(text).toContain(expectedPageTitle)
  })
})

it('should get correct served routes', () => {
  const rpfy = new Restapify({...restapifyParams})
  const servedRoutes = rpfy.getServedRoutes()
  const expectedServedRoutesAmount = 22
  const expectedServedRoutesResponse = [{ "method": "GET", "route": "/animals" }, { "method": "GET", "route": "/animals/[name]" }, { "method": "GET", "route": "/animals/[name]/friends" }, { "method": "GET", "route": "/animals/[name]/friends/[friend_id]" }, { "method": "GET", "route": "/animals/hedgehog" }, { "method": "GET", "route": "/cars" }, { "method": "GET", "route": "/comments" }, { "method": "GET", "route": "/comments/42" }, { "method": "GET", "route": "/comments/43" }, { "method": "GET", "route": "/comments/[id]" }, { "method": "GET", "route": "/plants" }, { "method": "GET", "route": "/posts" }, { "method": "GET", "route": "/posts/[postid]" }, { "method": "GET", "route": "/posts/[postid]/comments/[commentid]" }, { "method": "POST", "route": "/posts/[postid]/private/[isPrivate]"},{ "method": "GET", "route": "/users" }, { "method": "POST", "route": "/users" }, { "method": "GET", "route": "/users/[userid]" }, { "method": "PUT", "route": "/users/[userid]" }, { "method": "PATCH", "route": "/users/[userid]" }, { "method": "DELETE", "route": "/users/[userid]" }, { "method": "GET", "route": "/users/[userid]/friends" }]

  expect(servedRoutes.length).toBe(expectedServedRoutesAmount)
  expect(servedRoutes).toStrictEqual(expectedServedRoutesResponse)
})


it('should ignore files that are not json', () => {
  const filename = 'foobar.txt'
  const filePath = path.resolve(restapifyParams.rootDir, filename)

  fs.writeFileSync(filePath, 'not json file')

  const rpfy = new Restapify({...restapifyParams})
  const onErrorSpy = jest.fn()
  rpfy.on('error', onErrorSpy)

  rpfy.getServedRoutes()

  fs.unlinkSync(filePath)

  expect(onErrorSpy).not.toHaveBeenCalled()
})